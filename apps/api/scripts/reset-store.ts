import { existsSync, rmSync } from "node:fs";
import { config } from "../src/config";

if (existsSync(config.storeFile)) rmSync(config.storeFile);
console.log("Stockage PULSE réinitialisé : il sera recréé depuis seed.json (HAC-DATA-001) au prochain démarrage de l'API.");
