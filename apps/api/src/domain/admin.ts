import type { Challenge, ChallengeInput, Content, ContentInput } from "@pulse/shared";
import { notFound } from "../errors";
import { nextId, today, type Store } from "../store/store";

/**
 * Administration fonctionnelle (RG-ADM-01..06).
 * Volontairement limitée aux défis et contenus : aucune fonction ne renvoie objectifs,
 * préférences, participations nominatives ou métriques (RG-ADM-06).
 */
export function adminListChallenges(store: Store): Challenge[] {
  return store.read().challenges;
}

export function adminCreateChallenge(store: Store, adminId: string, input: ChallengeInput): Challenge {
  return store.write((data) => {
    const challenge: Challenge = {
      challengeId: nextId("chl", data.challenges.map((c) => c.challengeId)),
      ...input,
      createdBy: adminId,
    };
    data.challenges.push(challenge);
    return challenge;
  });
}

export function adminUpdateChallenge(store: Store, challengeId: string, input: ChallengeInput): Challenge {
  return store.write((data) => {
    const challenge = data.challenges.find((c) => c.challengeId === challengeId);
    if (!challenge) throw notFound("Défi");
    Object.assign(challenge, input);
    return challenge;
  });
}

export function adminListContents(store: Store): Content[] {
  return store.read().contents;
}

/** RG-ADM-05 : un contenu DRAFT n'a pas de date de publication. */
function applyPublication(content: Content, wasPublished: boolean) {
  if (content.status === "DRAFT") content.publishedAt = null;
  else if (!wasPublished || !content.publishedAt) content.publishedAt = today();
}

export function adminCreateContent(store: Store, adminId: string, input: ContentInput): Content {
  return store.write((data) => {
    const content: Content = {
      contentId: nextId("cnt", data.contents.map((c) => c.contentId)),
      ...input,
      publishedAt: null,
      updatedAt: today(),
      authorId: adminId,
    };
    applyPublication(content, false);
    data.contents.push(content);
    return content;
  });
}

export function adminUpdateContent(store: Store, contentId: string, input: ContentInput): Content {
  return store.write((data) => {
    const content = data.contents.find((c) => c.contentId === contentId);
    if (!content) throw notFound("Contenu");
    const wasPublished = content.status === "PUBLISHED";
    Object.assign(content, input, { updatedAt: today() });
    applyPublication(content, wasPublished);
    return content;
  });
}
