import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const here = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(here, "../../../.env"), quiet: true });

const DATA_DIR = path.resolve(here, "../data");

/** Configuration externalisée (HAC-TECH-001 §4.4) : rien de spécifique à l'environnement n'est codé en dur ailleurs. */
export const config = {
  port: Number(process.env.API_PORT ?? 4000),
  authServiceUrl: process.env.AUTH_SERVICE_URL ?? "http://localhost:4001",
  authServiceTimeoutMs: Number(process.env.AUTH_SERVICE_TIMEOUT_MS ?? 3000),
  authMeCacheSeconds: Number(process.env.AUTH_ME_CACHE_SECONDS ?? 15),
  corsOrigins: (process.env.CORS_ORIGINS ?? "http://localhost:5173").split(",").map((s) => s.trim()).filter(Boolean),
  seedFile: path.join(DATA_DIR, "seed.json"),
  storeFile: path.join(DATA_DIR, "store.json"),
};
