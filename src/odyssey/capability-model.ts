import type { Person } from "./types";
/** Portable projection for a future Passport adapter; contains private evidence. */
export function capabilityBrain(person: Person) {
  const claims = new Map(person.claims.map((c) => [c.id, c]));
  return {
    schema: "syrka.capabilities/1" as const,
    personId: person.id,
    capabilities: person.assertions
      .filter((a) => a.consent && a.selected !== false)
      .map((a) => ({
        id: a.id,
        capabilityId: a.skillId,
        label: a.label,
        evidenceId: a.claimId,
        status: a.verification,
        evidence: {
          text: claims.get(a.claimId)?.text || a.quote,
          quote: a.quote,
          sourceSystem: a.sourceSystem,
          sourceRecordId: a.sourceRecordId,
          page: a.page,
        },
      })),
    education: person.courses.map((c) => ({
      id: c.id,
      title: c.title,
      outcomes: c.outcomes,
      assessments: c.assessments,
    })),
    experiences: person.claims.filter((c) =>
      [
        "employment",
        "internship",
        "volunteering",
        "project",
        "education",
        "qualification",
      ].includes(c.kind),
    ),
  };
}
export function discoveryProjection(person: Person) {
  return {
    interests: person.interests,
    reportedRoles: person.claims
      .filter((c) => c.approved && c.kind === "employment")
      .slice(0, 20)
      .map((c) => c.text.slice(0, 300)),
    background: person.claims
      .filter(
        (c) =>
          c.approved &&
          [
            "education",
            "employment",
            "internship",
            "project",
            "qualification",
          ].includes(c.kind),
      )
      .slice(0, 30)
      .map((c) => c.text.slice(0, 300)),
    assertions: person.assertions
      .filter((a) => a.selected !== false && a.consent)
      .slice(0, 500)
      .map((a) => ({
        skillId: a.skillId,
        consent: a.consent,
        verification: ["institution-verified", "employer-verified"].includes(
          a.verification,
        )
          ? "document-supported"
          : a.verification,
      })),
  };
}
