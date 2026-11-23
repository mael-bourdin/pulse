/**
 * Tests de conformité du simulateur au contrat HAC-API-001 (ACC-AUTH-01..09).
 * Identifiants = données de démonstration HAC-DATA-001 (aucun secret réel).
 */
import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createSimulator } from "../src/app";

const usersFile = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../data/users.json");
let down = false;
const app = () => createSimulator({ usersFile, tokenTtlSeconds: 3600, isUnavailable: () => down });

const ALEX = { email: "alex.martin@demo.healthaicoach.fr", password: "DemoPassword!" };
const THOMAS = { email: "thomas.roy@demo.healthaicoach.fr", password: "DemoPassword!" };
const LEA = { email: "lea.bernard@demo.healthaicoach.fr", password: "AdminDemo!" };

beforeEach(() => {
  down = false;
});

describe("POST /api/v1/auth/login", () => {
  it("200 avec la structure du contrat (ACC-AUTH-03)", async () => {
    const res = await request(app()).post("/api/v1/auth/login").send(ALEX);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      userId: "usr-10027",
      email: ALEX.email,
      displayName: "Alex Martin",
      role: "USER",
      accountStatus: "ACTIVE",
      tokenType: "Bearer",
      expiresIn: 3600,
    });
    expect(typeof res.body.accessToken).toBe("string");
    expect(res.body).not.toHaveProperty("password");
    expect(res.body).not.toHaveProperty("passwordHash");
    expect(JSON.stringify(res.body)).not.toContain("DemoPassword");
  });

  it("retourne FUNCTIONAL_ADMIN pour Léa Bernard", async () => {
    const res = await request(app()).post("/api/v1/auth/login").send(LEA);
    expect(res.status).toBe(200);
    expect(res.body.role).toBe("FUNCTIONAL_ADMIN");
  });

  it.each([
    [{}],
    [{ email: ALEX.email }],
    [{ email: "", password: "x" }],
    [{ email: ALEX.email, password: "" }],
    [{ email: 42, password: "x" }],
  ])("400 AUTH_BAD_REQUEST pour %j (ACC-AUTH-04)", async (body) => {
    const res = await request(app()).post("/api/v1/auth/login").send(body);
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ code: "AUTH_BAD_REQUEST", message: "Invalid authentication request" });
  });

  it("400 pour un JSON malformé", async () => {
    const res = await request(app()).post("/api/v1/auth/login").set("Content-Type", "application/json").send("{oops");
    expect(res.status).toBe(400);
    expect(res.body.code).toBe("AUTH_BAD_REQUEST");
  });

  it("401 identique pour adresse connue ou inconnue (ACC-AUTH-05, REC-02)", async () => {
    const known = await request(app()).post("/api/v1/auth/login").send({ ...ALEX, password: "wrong" });
    const unknown = await request(app())
      .post("/api/v1/auth/login")
      .send({ email: "nobody@demo.healthaicoach.fr", password: "wrong" });
    expect(known.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(known.body).toEqual(unknown.body);
    expect(known.body.code).toBe("AUTH_INVALID_CREDENTIALS");
  });

  it("403 pour le compte DISABLED avec bons identifiants (ACC-AUTH-06, REC-03)", async () => {
    const res = await request(app()).post("/api/v1/auth/login").send(THOMAS);
    expect(res.status).toBe(403);
    expect(res.body.code).toBe("AUTH_ACCOUNT_DISABLED");
  });

  it("401 (et pas 403) pour le compte DISABLED avec un mauvais mot de passe", async () => {
    const res = await request(app()).post("/api/v1/auth/login").send({ ...THOMAS, password: "wrong" });
    expect(res.status).toBe(401);
  });

  it("503 quand le service est déclaré indisponible (ACC-AUTH-07, REC-04)", async () => {
    down = true;
    const res = await request(app()).post("/api/v1/auth/login").send(ALEX);
    expect(res.status).toBe(503);
    expect(res.body.code).toBe("AUTH_SERVICE_UNAVAILABLE");
  });
});

describe("GET /api/v1/auth/me", () => {
  it("200 avec un jeton émis par /login (ACC-AUTH-08, REC-05)", async () => {
    const a = app();
    const login = await request(a).post("/api/v1/auth/login").send(ALEX);
    const me = await request(a).get("/api/v1/auth/me").set("Authorization", `Bearer ${login.body.accessToken}`);
    expect(me.status).toBe(200);
    expect(me.body).toEqual({
      userId: "usr-10027",
      email: ALEX.email,
      displayName: "Alex Martin",
      role: "USER",
      accountStatus: "ACTIVE",
    });
  });

  it.each([[undefined], ["Bearer nope"], ["Basic abc"]])("401 AUTH_INVALID_TOKEN (%s)", async (header) => {
    const req = request(app()).get("/api/v1/auth/me");
    const res = header ? await req.set("Authorization", header) : await req;
    expect(res.status).toBe(401);
    expect(res.body.code).toBe("AUTH_INVALID_TOKEN");
  });

  it("503 quand indisponible", async () => {
    down = true;
    const res = await request(app()).get("/api/v1/auth/me").set("Authorization", "Bearer x");
    expect(res.status).toBe(503);
  });
});
