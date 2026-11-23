import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import type { Challenge, Content, Goal, Metric, Participation, Preferences } from "@pulse/shared";

/**
 * Stockage simple retenu pour PULSE V1 (HAC-PROD-001 §9) : un document JSON local,
 * initialisé depuis les données synthétiques HAC-DATA-001 (seed.json).
 * La persistance cible (PostgreSQL / MongoDB) est un sujet PULSE V2.
 */
export interface Data {
  preferences: Preferences[];
  goals: Goal[];
  challenges: Challenge[];
  participations: Participation[];
  metrics: Metric[];
  contents: Content[];
}

export interface Store {
  read(): Data;
  /** Applique une mutation puis persiste. */
  write<T>(mutate: (data: Data) => T): T;
}

export class JsonFileStore implements Store {
  private data: Data;

  constructor(
    private readonly file: string,
    seedFile: string,
  ) {
    const source = existsSync(file) ? file : seedFile;
    this.data = JSON.parse(readFileSync(source, "utf8")) as Data;
    if (source === seedFile) this.flush();
  }

  read(): Data {
    return this.data;
  }

  write<T>(mutate: (data: Data) => T): T {
    const result = mutate(this.data);
    this.flush();
    return result;
  }

  private flush() {
    const tmp = `${this.file}.tmp`;
    writeFileSync(tmp, JSON.stringify(this.data, null, 2));
    renameSync(tmp, this.file); // écriture atomique
  }
}

/** Variante en mémoire pour les tests. */
export class MemoryStore implements Store {
  private data: Data;
  constructor(seed: Data) {
    this.data = structuredClone(seed);
  }
  read() {
    return this.data;
  }
  write<T>(mutate: (data: Data) => T): T {
    return mutate(this.data);
  }
}

export function nextId(prefix: string, ids: string[]): string {
  const max = ids.reduce((m, id) => {
    const n = Number(id.slice(prefix.length + 1));
    return Number.isFinite(n) && n > m ? n : m;
  }, 0);
  return `${prefix}-${String(max + 1).padStart(3, "0")}`;
}

export const today = () => new Date().toISOString().slice(0, 10);
