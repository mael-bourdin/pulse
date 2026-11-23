// Mécanisme documenté de simulation d'indisponibilité (HAC-API-001 §9, ACC-AUTH-07, REC-04).
// "down" crée le fichier drapeau lu à chaque requête par le simulateur ; "up" le supprime.
// Aucun redémarrage nécessaire.
import { existsSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const flag = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../apps/auth-simulator/data/.unavailable");
const mode = process.argv[2];

if (mode === "down") {
  writeFileSync(flag, `unavailable since ${new Date().toISOString()}\n`);
  console.log("Simulateur d'authentification : INDISPONIBLE (toutes les requêtes -> 503 AUTH_SERVICE_UNAVAILABLE)");
} else if (mode === "up") {
  if (existsSync(flag)) rmSync(flag);
  console.log("Simulateur d'authentification : DISPONIBLE");
} else {
  console.log(`Usage : pnpm auth:down | pnpm auth:up (état actuel : ${existsSync(flag) ? "indisponible" : "disponible"})`);
  process.exitCode = 1;
}
