import { emptyPerson, emptyWorkspace } from "../odyssey/profile";
import type {
  OntologySkill,
  Workspace,
  Claim,
  Assertion,
} from "../odyssey/types";
import { capabilitySeeds, courseSeeds } from "./seeds";
import { emptyLiving } from "./schema";
export type DemoScenario =
  "ppe-consulting" | "ppe-risk" | "tax-research" | "student";
export function livingDemo(
  skills: Pick<OntologySkill, "id" | "label" | "aliases">[],
  scenario: DemoScenario,
): Workspace {
  const tax = scenario === "tax-research",
    limited = scenario === "student";
  const p = {
    ...emptyPerson(),
    id: "fictional:" + scenario,
    name: tax
      ? "Morgan · fictional tax adviser"
      : limited
        ? "Alex · fictional student"
        : "Sam · fictional PPE student",
    headline: tax
      ? "Ten years of reported tax advisory experience; exploring research."
      : limited
        ? "A small academic foundation. No employment history is assumed."
        : "Politics, Philosophy and Economics · a fictional Charles University journey",
    fictional: true,
    interests: tax
      ? ["taxation", "academic research"]
      : limited
        ? ["research", "programming"]
        : ["economics", "public policy", "geopolitical risk"],
    claims: [] as Claim[],
    assertions: [] as Assertion[],
  };
  const indices = tax ? [9, 8, 7] : limited ? [0] : [0, 1, 3, 7];
  for (const i of indices) {
    const seed = capabilitySeeds[i],
      s = skills.find((s) => s.label.toLowerCase() === seed[0].toLowerCase());
    if (!s) continue;
    const id = "fictional-claim:" + i;
    p.claims.push({
      id,
      kind: tax ? "employment" : "skill",
      text: "Fictional demonstration: " + s.label,
      quote: "Fictional demonstration: " + s.label,
      page: 1,
      section: "Fictional evidence",
      mappings: [
        {
          skillId: s.id,
          label: s.label,
          method: "exact",
          confidence: "high",
          confirmed: false,
          selected: true,
        },
      ],
      approved: true,
    });
    p.assertions.push({
      id: "fictional-assertion:" + i,
      skillId: s.id,
      label: s.label,
      claimId: id,
      sourceSystem: "fictional-fixture",
      sourceRecordId: scenario,
      quote: "Fictional demonstration: " + s.label,
      verification: "document-supported",
      consent: true,
      selected: true,
    });
  }
  p.claims.push({
    id: "fictional-degree",
    kind: "education",
    text: tax
      ? "Fictional Accounting degree, 2010–2013"
      : limited
        ? "Fictional secondary education, in progress"
        : "Fictional Charles University PPE study, 2024–2026",
    quote: tax
      ? "Fictional Accounting degree, 2010–2013"
      : limited
        ? "Fictional secondary education, in progress"
        : "Fictional Charles University PPE study, 2024–2026",
    dates: tax ? "2010–2013" : "2024–2026",
    page: 1,
    section: "Fictional education",
    mappings: [],
    approved: true,
  });
  if (tax)
    p.claims.push({
      id: "fictional-career",
      kind: "employment",
      text: "Fictional tax advisor, ten years of practice",
      quote: "Fictional tax advisor, ten years of practice",
      dates: "2016–2026",
      page: 1,
      section: "Fictional employment",
      mappings: [],
      approved: true,
    });
  if (!tax && !limited)
    p.courses = courseSeeds.slice(0, 3).map((c) => ({
      id: "course:" + c.slug,
      institution: "Charles University — FICTIONAL demonstration",
      programme: "PPE teaching fixture",
      code: "No real course code asserted",
      title: c.title,
      status: "reported-complete",
      sourceSystem: "fictional-fixture",
      sourceRecordId: "ppe-fixture-1",
      verification: "document-supported",
      outcomes: c.caps.map((i) => ({
        id: "fixture-outcome:" + c.slug + ":" + i,
        text: "Fictional assessed outcome: " + capabilitySeeds[i][1],
        quote: "Fictional assessed outcome: " + capabilitySeeds[i][1],
        skillIds: skills
          .filter(
            (s) =>
              s.label.toLowerCase() === capabilitySeeds[i][0].toLowerCase(),
          )
          .map((s) => s.id),
      })),
      assessments: [
        {
          title: "Fictional coursework assessment",
          evidence:
            "Illustrative assessment record; no actual university result.",
          skillIds: [],
        },
      ],
    }));
  const w = emptyWorkspace(p);
  w.living = {
    ...emptyLiving(),
    goals: tax
      ? ["goal:doctoral"]
      : scenario === "ppe-risk"
        ? ["goal:risk"]
        : limited
          ? ["goal:research"]
          : ["goal:mckinsey", "goal:mba"],
    expanded: ["person"],
    academic: {
      institution: tax
        ? "Fictional institution"
        : limited
          ? "Fictional secondary school"
          : "Charles University — FICTIONAL scenario",
      faculty: tax ? "Accounting" : "Social sciences (fixture)",
      programme: tax
        ? "Accounting"
        : limited
          ? "Exploring subjects"
          : "Politics, Philosophy and Economics (fixture)",
      level: tax
        ? "Prior degree"
        : limited
          ? "Secondary"
          : "Bachelor's (fixture)",
      specialisation: tax ? "Tax advisory" : "Interdisciplinary",
      year: tax ? "Mid-career" : limited ? "Final year" : "Year 2 (fixture)",
      term: "Next semester",
      creditLimit: 30,
      remainingRequirements: [
        "Programme requirements must be checked with the institution.",
      ],
    },
    ...(tax ? { catalogue: { version: "syrka.courses/1", courses: [] } } : {}),
  };
  return w;
}
