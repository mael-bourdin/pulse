import { config } from "./config";
import { createSimulator, fileFlag } from "./app";

const app = createSimulator({
  usersFile: config.usersFile,
  tokenTtlSeconds: config.tokenTtlSeconds,
  isUnavailable: fileFlag(config.unavailableFlagFile),
});

app.listen(config.port, () => {
  console.log(`[auth-sim] Simulateur HAC-API-001 sur http://localhost:${config.port}/api/v1/auth`);
  console.log(`[auth-sim] 503 : "pnpm auth:down" pour couper, "pnpm auth:up" pour rétablir`);
});
