// Vérification simple d'absence de secrets dans les fichiers suivis par Git (ACC-SEC-01).
// Les mots de passe de DÉMONSTRATION HAC-DATA-001 sont autorisés uniquement dans les tests et la doc.
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

const files = execSync("git ls-files", { encoding: "utf8" }).split("\n").filter(Boolean);
const rules = [
  { name: "Clé privée", re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
  { name: "Jeton GitHub", re: /\bgh[pousr]_[A-Za-z0-9]{30,}/ },
  { name: "Clé AWS", re: /\bAKIA[0-9A-Z]{16}\b/ },
  { name: "Clé API générique", re: /\b(sk|pk)_(live|prod)_[A-Za-z0-9]{16,}/ },
  { name: "Fichier .env versionné", file: (f) => /(^|\/)\.env$/.test(f) },
  { name: "Mot de passe de démo hors tests/doc", re: /DemoPassword!|AdminDemo!/, allow: (f) => /(^|\/)(test|docs)\/|README\.md$|check-secrets\.mjs$/.test(f) },
];

const problems = [];
for (const f of files) {
  for (const r of rules) {
    if (r.file?.(f)) problems.push(`${r.name} : ${f}`);
    if (!r.re || r.allow?.(f)) continue;
    let text;
    try { text = readFileSync(f, "utf8"); } catch { continue; }
    if (r.re.test(text)) problems.push(`${r.name} : ${f}`);
  }
}
if (problems.length) {
  console.error("Secrets potentiels détectés :\n- " + problems.join("\n- "));
  process.exit(1);
}
console.log(`OK : aucun secret détecté dans ${files.length} fichiers suivis.`);
