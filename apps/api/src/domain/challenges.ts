import type { Challenge, ChallengeView, Participation } from "@pulse/shared";
import { conflict, notFound } from "../errors";
import { nextId, today, type Data, type Store } from "../store/store";

/** Participation la plus pertinente de l'utilisateur pour un défi : l'ACTIVE si elle existe, sinon la plus récente. */
function myParticipation(data: Data, userId: string, challengeId: string): Participation | null {
  const mine = data.participations.filter((p) => p.userId === userId && p.challengeId === challengeId);
  return mine.find((p) => p.status === "ACTIVE") ?? mine.sort((a, b) => b.joinedAt.localeCompare(a.joinedAt))[0] ?? null;
}

function toView(data: Data, userId: string, challenge: Challenge): ChallengeView {
  const participation = myParticipation(data, userId, challenge.challengeId);
  return {
    ...challenge,
    myParticipation: participation,
    canJoin: challenge.status === "OPEN" && participation?.status !== "ACTIVE",
  };
}

export function listChallenges(store: Store, userId: string): ChallengeView[] {
  const data = store.read();
  return data.challenges.map((c) => toView(data, userId, c));
}

export function getChallenge(store: Store, userId: string, challengeId: string): ChallengeView {
  const data = store.read();
  const challenge = data.challenges.find((c) => c.challengeId === challengeId);
  if (!challenge) throw notFound("Défi");
  return toView(data, userId, challenge);
}

/**
 * RG-CHAL-02..05.
 * Après une sortie (LEFT), une NOUVELLE participation est créée (choix Squad, cf. docs/decisions) :
 * l'historique de participation est conservé tel quel.
 */
export function joinChallenge(store: Store, userId: string, challengeId: string): ChallengeView {
  return store.write((data) => {
    const challenge = data.challenges.find((c) => c.challengeId === challengeId);
    if (!challenge) throw notFound("Défi");
    if (challenge.status === "UPCOMING") {
      throw conflict("CHALLENGE_NOT_OPEN", "Ce défi n’a pas encore commencé : l’inscription ouvrira bientôt.");
    }
    if (challenge.status === "CLOSED") {
      throw conflict("CHALLENGE_CLOSED", "Ce défi est terminé : il n’est plus possible de le rejoindre.");
    }
    const active = data.participations.find(
      (p) => p.userId === userId && p.challengeId === challengeId && p.status === "ACTIVE",
    );
    if (active) throw conflict("ALREADY_JOINED", "Vous participez déjà à ce défi.");

    data.participations.push({
      participationId: nextId("part", data.participations.map((p) => p.participationId)),
      challengeId,
      userId,
      joinedAt: today(),
      progressValue: 0,
      status: "ACTIVE",
    });
    return toView(data, userId, challenge);
  });
}

/** RG-CHAL-07 */
export function leaveChallenge(store: Store, userId: string, challengeId: string): ChallengeView {
  return store.write((data) => {
    const challenge = data.challenges.find((c) => c.challengeId === challengeId);
    if (!challenge) throw notFound("Défi");
    const active = data.participations.find(
      (p) => p.userId === userId && p.challengeId === challengeId && p.status === "ACTIVE",
    );
    if (!active) throw conflict("NOT_JOINED", "Vous ne participez pas actuellement à ce défi.");
    active.status = "LEFT";
    return toView(data, userId, challenge);
  });
}

/** RG-CHAL-08 : participations de l'utilisateur connecté uniquement. */
export function listMyParticipations(store: Store, userId: string) {
  const data = store.read();
  return data.participations
    .filter((p) => p.userId === userId)
    .map((p) => ({ participation: p, challenge: data.challenges.find((c) => c.challengeId === p.challengeId)! }))
    .filter((x) => x.challenge);
}
