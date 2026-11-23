import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  envDir: "../..", // lit VITE_API_URL depuis le .env racine
  server: { port: 5173, strictPort: true },
  clearScreen: false,
});
