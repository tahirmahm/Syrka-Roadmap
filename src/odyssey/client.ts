import type { Occupation, OntologySkill } from "./types";
const base = process.env.NEXT_PUBLIC_BASE_PATH || "";
export async function jsonRequest<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const r = await fetch(base + path, init);
  if (!r.ok) {
    const d = await r.json().catch(() => ({}));
    throw new Error(d.error || `Request failed (${r.status})`);
  }
  return r.json();
}
let vocabulary: Promise<
  Pick<OntologySkill, "id" | "label" | "aliases">[]
> | null = null;
export function getVocabulary() {
  if (!vocabulary)
    vocabulary = jsonRequest<{
      skills: Pick<OntologySkill, "id" | "label" | "aliases">[];
    }>("/api/catalogue?mode=skills")
      .then((x) => x.skills)
      .catch((e) => {
        vocabulary = null;
        throw e;
      });
  return vocabulary;
}
export type OccupationBundle = {
  occupation: Occupation;
  skills: OntologySkill[];
  related: {
    occupation: Occupation;
    shared: number;
    relation: "shared-requirements";
  }[];
  version: string;
};
export function getOccupation(id: string) {
  return jsonRequest<OccupationBundle>(
    "/api/catalogue?id=" + encodeURIComponent(id),
  );
}
export function downloadJSON(value: unknown, name: string) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
