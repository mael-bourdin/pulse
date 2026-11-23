import { config } from "./config";
import { createApp } from "./app";
import { HttpAuthClient } from "./integrations/auth/authClient";
import { JsonFileStore } from "./store/store";

const app = createApp({
  authClient: new HttpAuthClient(config.authServiceUrl, config.authServiceTimeoutMs),
  store: new JsonFileStore(config.storeFile, config.seedFile),
  corsOrigins: config.corsOrigins,
  authMeCacheSeconds: config.authMeCacheSeconds,
});

app.listen(config.port, () => {
  console.log(`[api] PULSE API sur http://localhost:${config.port} (auth : ${config.authServiceUrl})`);
});
