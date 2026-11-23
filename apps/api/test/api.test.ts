import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { CREDS, setup } from "./helpers";

let ctx: Awaited<ReturnType<typeof setup>>;
let alex: string;
let lea: string;

beforeAll(async () => {
  ctx = await setup();
  alex = await ctx.login("alex");
  lea = await ctx.login("lea");
});
afterAll(() => ctx.close());

const as = (token: string) => ({ Authorization: `Bearer ${token}` });

describe("F1 – connexion via le simulateur", () => {
  it("REC-01 : Alex obtient un contexte USER", async () => {
    const res = await request(ctx.app).post("/api/auth/login").send(CREDS.alex);
    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ userId: "usr-10027", role: "USER", displayName: "Alex Martin" });
    expect(JSON.stringify(res.body)).not.toContain("DemoPassword");
  });

  it("REC-02 : mauvais identifiants -> message identique (compte connu ou non)", async () => {
    const a = await request(ctx.app).post("/api/auth/login").send({ ...CREDS.alex, password: "nope" });
    const b = await request(ctx.app).post("/api/auth/login").send({ email: "x@demo.healthaicoach.fr", password: "nope" });
    expect(a.status).toBe(401);
    expect(a.body).toEqual(b.body);
  });

  it("REC-03 : compte désactivé refusé avec message maîtrisé", async () => {
    const res = await request(ctx.app).post("/api/auth/login").send(CREDS.thomas);
    expect(res.status).toBe(403);
    expect(res.body.code).toBe("ACCOUNT_DISABLED");
  });

  it("REC-04 : service indisponible -> 503 distinct d'un refus", async () => {
    ctx.state.down = true;
    const res = await request(ctx.app).post("/api/auth/login").send(CREDS.alex);
    ctx.state.down = false;
    expect(res.status).toBe(503);
    expect(res.body.code).toBe("AUTH_UNAVAILABLE");
    expect(res.body.message).not.toMatch(/stack|Error|localhost|ECONN/);
  });

  it("400 si champ vide", async () => {
    const res = await request(ctx.app).post("/api/auth/login").send({ email: "", password: "" });
    expect(res.status).toBe(400);
  });

  it("REC-05 : session vérifiée via /me", async () => {
    const res = await request(ctx.app).get("/api/auth/session").set(as(alex));
    expect(res.status).toBe(200);
    expect(res.body.user.userId).toBe("usr-10027");
  });

  it("jeton invalide -> 401", async () => {
    const res = await request(ctx.app).get("/api/me/goals").set(as("forged"));
    expect(res.status).toBe(401);
  });
});

describe("Contrôle d'accès par rôle (côté API)", () => {
  it("REC-12 : un USER est refusé sur l'admin, même en appel direct", async () => {
    const res = await request(ctx.app).get("/api/admin/challenges").set(as(alex));
    expect(res.status).toBe(403);
    const post = await request(ctx.app).post("/api/admin/challenges").set(as(alex)).send({});
    expect(post.status).toBe(403);
  });

  it("REC-11 : FUNCTIONAL_ADMIN accède à l'admin", async () => {
    const res = await request(ctx.app).get("/api/admin/challenges").set(as(lea));
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(6);
  });

  it("l'admin n'accède pas aux données personnelles (RG-AUTH-05)", async () => {
    const res = await request(ctx.app).get("/api/me/goals").set(as(lea));
    expect(res.status).toBe(403);
  });
});

describe("F2 – préférences", () => {
  it("REC-06 : consulter pref-001 puis modifier", async () => {
    const get = await request(ctx.app).get("/api/me/preferences").set(as(alex));
    expect(get.body).toMatchObject({ preferenceId: "pref-001", themePrioritaire: "ACTIVITE", momentPrefere: "MATIN" });
    const put = await request(ctx.app)
      .put("/api/me/preferences")
      .set(as(alex))
      .send({ ...get.body, preferenceId: undefined, userId: undefined, momentPrefere: "SOIR" });
    expect(put.status).toBe(200);
    const again = await request(ctx.app).get("/api/me/preferences").set(as(alex));
    expect(again.body.momentPrefere).toBe("SOIR");
  });

  it("ACC-PREF-05 : valeur hors référentiel refusée", async () => {
    const res = await request(ctx.app).put("/api/me/preferences").set(as(alex)).send({
      themePrioritaire: "YOGA",
      notifications: true,
      frequenceRappel: "QUOTIDIEN",
      momentPrefere: "MATIN",
      participationDefis: true,
    });
    expect(res.status).toBe(400);
    expect(res.body.details[0].field).toBe("themePrioritaire");
  });

  it("ACC-PREF-06 : impossible de cibler un autre utilisateur via un userId", async () => {
    const res = await request(ctx.app).put("/api/me/preferences").set(as(alex)).send({
      userId: "usr-10028",
      themePrioritaire: "STRESS",
      notifications: true,
      frequenceRappel: "QUOTIDIEN",
      momentPrefere: "MATIN",
      participationDefis: true,
    });
    expect(res.status).toBe(400);
  });
});

describe("F3 – objectifs", () => {
  it("ACC-GOAL-01 : Alex voit uniquement ses objectifs", async () => {
    const res = await request(ctx.app).get("/api/me/goals").set(as(alex));
    expect(res.body.map((g: { goalId: string }) => g.goalId).sort()).toEqual(["goal-001", "goal-002", "goal-009"]);
  });

  it("REC-07 : créer, retrouver, faire évoluer", async () => {
    const created = await request(ctx.app)
      .post("/api/me/goals")
      .set(as(alex))
      .send({ label: "Faire 30 minutes d’activité", category: "ACTIVITE", targetValue: 30, unit: "min/jour" });
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({ status: "ACTIVE", userId: "usr-10027", currentValue: 0 });
    const id = created.body.goalId;

    const progress = await request(ctx.app).put(`/api/me/goals/${id}/progress`).set(as(alex)).send({ currentValue: 12 });
    expect(progress.body.currentValue).toBe(12);
    const suspended = await request(ctx.app).post(`/api/me/goals/${id}/suspend`).set(as(alex));
    expect(suspended.body.status).toBe("SUSPENDED");
    const edit = await request(ctx.app).patch(`/api/me/goals/${id}`).set(as(alex)).send({ label: "x" });
    expect(edit.status).toBe(409);
    const closed = await request(ctx.app).post(`/api/me/goals/${id}/close`).set(as(alex));
    expect(closed.body.status).toBe("CLOSED");
    const reopen = await request(ctx.app).post(`/api/me/goals/${id}/reactivate`).set(as(alex));
    expect(reopen.status).toBe(409);
  });

  it.each([[0], [-5], [""], ["abc"]])("ACC-GOAL-04 : cible %j refusée", async (targetValue) => {
    const res = await request(ctx.app)
      .post("/api/me/goals")
      .set(as(alex))
      .send({ label: "Test", category: "ACTIVITE", targetValue, unit: "pas/jour" });
    expect(res.status).toBe(400);
  });

  it("RG-GOAL-08 : progression négative refusée", async () => {
    const res = await request(ctx.app).put("/api/me/goals/goal-001/progress").set(as(alex)).send({ currentValue: -1 });
    expect(res.status).toBe(400);
  });

  it("ACC-GOAL-09 : l'objectif d'un autre utilisateur est introuvable", async () => {
    const res = await request(ctx.app).patch("/api/me/goals/goal-003").set(as(alex)).send({ label: "pwned" });
    expect(res.status).toBe(404);
    const close = await request(ctx.app).post("/api/me/goals/goal-003/close").set(as(alex));
    expect(close.status).toBe(404);
  });

  it("RG-GOAL-07 : un objectif CLOSED n'est plus modifiable", async () => {
    const res = await request(ctx.app).patch("/api/me/goals/goal-009").set(as(alex)).send({ label: "x" });
    expect(res.status).toBe(409);
  });
});

describe("F4 – défis", () => {
  it("ACC-CHAL-01/02 : 6 défis avec statuts", async () => {
    const res = await request(ctx.app).get("/api/me/challenges").set(as(alex));
    expect(res.body).toHaveLength(6);
    const chl1 = res.body.find((c: { challengeId: string }) => c.challengeId === "chl-001");
    expect(chl1.myParticipation.participationId).toBe("part-001");
    expect(chl1.canJoin).toBe(false);
  });

  it("REC-08 : rejoindre chl-005 (OPEN)", async () => {
    const res = await request(ctx.app).post("/api/me/challenges/chl-005/join").set(as(alex));
    expect(res.status).toBe(200);
    expect(res.body.myParticipation).toMatchObject({ status: "ACTIVE", userId: "usr-10027" });
  });

  it("ACC-CHAL-05 : pas de doublon actif", async () => {
    const res = await request(ctx.app).post("/api/me/challenges/chl-001/join").set(as(alex));
    expect(res.status).toBe(409);
    expect(res.body.code).toBe("ALREADY_JOINED");
  });

  it("REC-09 : chl-004 CLOSED refusé ; chl-003 UPCOMING refusé", async () => {
    expect((await request(ctx.app).post("/api/me/challenges/chl-004/join").set(as(alex))).status).toBe(409);
    expect((await request(ctx.app).post("/api/me/challenges/chl-003/join").set(as(alex))).status).toBe(409);
  });

  it("retour sur chl-002 après sortie (part-006 LEFT) puis quitter", async () => {
    const join = await request(ctx.app).post("/api/me/challenges/chl-002/join").set(as(alex));
    expect(join.status).toBe(200);
    expect(join.body.myParticipation.participationId).not.toBe("part-006");
    const leave = await request(ctx.app).post("/api/me/challenges/chl-002/leave").set(as(alex));
    expect(leave.body.myParticipation.status).toBe("LEFT");
    expect(leave.body.canJoin).toBe(true);
  });
});

describe("F5 – progression", () => {
  it("REC-10 : synthèse d'Alex cohérente avec HAC-DATA-001 + états vides", async () => {
    const res = await request(ctx.app).get("/api/me/progress").set(as(alex));
    expect(res.status).toBe(200);
    const byType = Object.fromEntries(res.body.metrics.map((m: { metricType: string; value: number | null }) => [m.metricType, m.value]));
    expect(byType).toMatchObject({ WEEKLY_ACTIVE_DAYS: 5, STREAK_DAYS: 4, WELLBEING_CHECKINS: null, HYDRATION_DAYS: null });
    expect(res.body.period).toEqual({ start: "2026-02-09", end: "2026-02-15" });
    expect(JSON.stringify(res.body)).not.toContain("usr-10028");
  });
});

describe("F6 – administration", () => {
  const valid = {
    title: "Pause écran",
    category: "STRESS",
    description: "Faire une pause de 5 minutes sans écran toutes les deux heures",
    startDate: "2026-04-01",
    endDate: "2026-04-07",
    targetValue: 4,
    unit: "séances/jour",
    status: "UPCOMING",
  };

  it("REC-13 : créer puis modifier un défi", async () => {
    const created = await request(ctx.app).post("/api/admin/challenges").set(as(lea)).send(valid);
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({ challengeId: "chl-007", createdBy: "adm-10001" });
    const updated = await request(ctx.app)
      .put("/api/admin/challenges/chl-007")
      .set(as(lea))
      .send({ ...valid, status: "OPEN" });
    expect(updated.body.status).toBe("OPEN");
    const list = await request(ctx.app).get("/api/admin/challenges").set(as(lea));
    expect(list.body.find((c: { challengeId: string }) => c.challengeId === "chl-007").status).toBe("OPEN");
  });

  it("ACC-ADM-05 : champs manquants / dates incohérentes refusés", async () => {
    const missing = await request(ctx.app).post("/api/admin/challenges").set(as(lea)).send({ title: "" });
    expect(missing.status).toBe(400);
    const dates = await request(ctx.app)
      .post("/api/admin/challenges")
      .set(as(lea))
      .send({ ...valid, startDate: "2026-05-10", endDate: "2026-05-01" });
    expect(dates.status).toBe(400);
    expect(dates.body.details[0].field).toBe("endDate");
  });

  it("ACC-ADM-07 : publier un contenu DRAFT renseigne publishedAt", async () => {
    const res = await request(ctx.app)
      .put("/api/admin/contents/cnt-004")
      .set(as(lea))
      .send({ title: "Idées de petit-déjeuner équilibré", type: "ARTICLE", category: "NUTRITION", status: "PUBLISHED" });
    expect(res.body.publishedAt).not.toBeNull();
  });
});
