import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const here = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(here, "../../../.env"), quiet: true });

export const DATA_DIR = path.resolve(here, "../data");

export const config = {
  port: Number(process.env.AUTH_SIM_PORT ?? 4001),
  tokenTtlSeconds: Number(process.env.AUTH_SIM_TOKEN_TTL_SECONDS ?? 3600),
  usersFile: path.join(DATA_DIR, "users.json"),
  /** Mécanisme 503 : présence de ce fichier OU variable AUTH_SIM_FORCE_UNAVAILABLE=true. */
  unavailableFlagFile: path.join(DATA_DIR, ".unavailable"),
};
