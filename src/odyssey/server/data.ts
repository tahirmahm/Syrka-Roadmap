// Read the versioned server snapshot without bundling its 27 MB into client code
// or asking TypeScript to infer tens of thousands of JSON literal types.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Catalogue } from "../types";
export const catalogue: Catalogue = JSON.parse(
  readFileSync(join(process.cwd(), "src/data/catalogue.json"), "utf8"),
);
export const occupationById = new Map(
  catalogue.occupations.map((o) => [o.id, o]),
);
export const ontologySkillById = new Map(
  catalogue.skills.map((s) => [s.id, s]),
);
