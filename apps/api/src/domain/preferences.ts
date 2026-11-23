import type { Preferences, PreferencesUpdate } from "@pulse/shared";
import { notFound } from "../errors";
import { nextId, type Store } from "../store/store";

/** RG-PREF-01 : toujours celles de l'utilisateur authentifié (userId issu du jeton, jamais du client). */
export function getPreferences(store: Store, userId: string): Preferences {
  const prefs = store.read().preferences.find((p) => p.userId === userId);
  if (!prefs) throw notFound("Préférences");
  return prefs;
}

export function updatePreferences(store: Store, userId: string, input: PreferencesUpdate): Preferences {
  return store.write((data) => {
    let prefs = data.preferences.find((p) => p.userId === userId);
    if (!prefs) {
      prefs = { preferenceId: nextId("pref", data.preferences.map((p) => p.preferenceId)), userId, ...input };
      data.preferences.push(prefs);
    } else {
      Object.assign(prefs, input);
    }
    return prefs;
  });
}
