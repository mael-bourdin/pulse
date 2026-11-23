import path from "node:path";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import request from "supertest";
import { createSimulator } from "@pulse/auth-simulator/app";
import { createApp } from "../src/app";
import { HttpAuthClient } from "../src/integrations/auth/authClient";
import { MemoryStore, type Data } from "../src/store/store";

const here = path.dirname(fileURLToPath(import.meta.url));
const seed = JSON.parse(readFileSync(path.resolve(here, "../data/seed.json"), "utf8")) as Data;
const usersFile = path.resolve(here, "../../auth-simulator/data/users.json");

export const CREDS = {
  alex: { email: "alex.martin@demo.healthaicoach.fr", password: "DemoPassword!" },
  samira: { email: "samira.benali@demo.healthaicoach.fr", password: "DemoPassword!" },
  thomas: { email: "thomas.roy@demo.healthaicoach.fr", password: "DemoPassword!" },
  lea: { email: "lea.bernard@demo.healthaicoach.fr", password: "AdminDemo!" },
};

/** Démarre un vrai simulateur HTTP + l'API branchée dessus via le contrat (test d'intégration). */
export async function setup() {
  const state = { down: false };
  const sim = createSimulator({ usersFile, tokenTtlSeconds: 3600, isUnavailable: () => state.down });
  const server: Server = await new Promise((resolve) => {
    const s = sim.listen(0, () => resolve(s));
  });
  const port = (server.address() as AddressInfo).port;
  const app = createApp({
    authClient: new HttpAuthClient(`http://127.0.0.1:${port}`, 2000),
    store: new MemoryStore(seed),
    corsOrigins: [],
  });

  const login = async (who: keyof typeof CREDS) => {
    const res = await request(app).post("/api/auth/login").send(CREDS[who]);
    return res.body.accessToken as string;
  };

  return { app, state, login, close: () => new Promise<void>((r) => server.close(() => r())) };
}
