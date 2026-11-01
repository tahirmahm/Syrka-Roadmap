import { courseCatalogueSchema, type CourseRecord } from "./schema";
/** Explicit file-import adapter, never a scraper or an enrolment authority. */
export function importCourseCatalogue(raw: string) {
  if (new TextEncoder().encode(raw).byteLength > 1_000_000)
    throw new Error("Course catalogue exceeds 1 MB.");
  const parsed = courseCatalogueSchema.parse(JSON.parse(raw));
  const seen = new Set<string>();
  for (const c of parsed.courses) {
    if (seen.has(c.id)) throw new Error("Duplicate course identifier");
    seen.add(c.id);
    if (
      c.source.kind !== "fixture" &&
      (!c.source.url || new URL(c.source.url).protocol !== "https:")
    )
      throw new Error(
        "Imported course records require an official HTTPS reference.",
      );
  }
  for (const c of parsed.courses)
    if (c.prerequisites.some((id) => !seen.has(id)))
      throw new Error("Course prerequisite references an unknown course");
  detectCourseCycles(parsed.courses);
  return {
    ...parsed,
    courses: parsed.courses.map((c) => ({
      ...c,
      source:
        c.source.kind === "fixture"
          ? c.source
          : {
              ...c.source,
              kind: "official-import" as const,
              quality: "document-supported" as const,
              checkedAt: null,
            },
    })),
  };
}
export function detectCourseCycles(courses: CourseRecord[]) {
  const courseIds = new Set(courses.map((c) => c.id));
  if (courseIds.size !== courses.length)
    throw new Error("Duplicate course identifier");
  for (const c of courses) {
    if (
      /^(?:person$|programme$|cap:|subject:|goal:|project:|quest:|evidence:|record-course:|opportunity:|occupation:)/.test(
        c.id,
      )
    )
      throw new Error(
        "Reserved graph identifier cannot be used as a course ID",
      );
    if (c.prerequisites.some((id) => !courseIds.has(id)))
      throw new Error("Course prerequisite references an unknown course");
  }
  const byId = new Map(courses.map((c) => [c.id, c])),
    done = new Set<string>(),
    active = new Set<string>();
  function visit(id: string) {
    if (active.has(id)) throw new Error("Course prerequisite cycle detected");
    if (done.has(id)) return;
    active.add(id);
    byId.get(id)?.prerequisites.forEach(visit);
    active.delete(id);
    done.add(id);
  }
  courses.forEach((c) => visit(c.id));
}
export type SourceAdapter = {
  id: string;
  version: string;
  import: (raw: string) => ReturnType<typeof importCourseCatalogue>;
};
export const officialCatalogueAdapter: SourceAdapter = {
  id: "official-catalogue-file",
  version: "1",
  import: importCourseCatalogue,
};
export const evidenceAdapters = [
  { id: "reviewed-document", status: "available" },
  { id: "linkedin-export", status: "manual reviewed import" },
  {
    id: "github-project",
    status: "manual reviewed reference; no automatic expertise",
  },
  { id: "publication", status: "manual reviewed reference" },
  {
    id: "campus",
    status: "not connected; requires data-sharing authorization",
  },
] as const;
