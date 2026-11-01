import type { Provenance } from "./schema";
export const editorial: Provenance = {
  kind: "editorial",
  reference:
    "Syrka learning/preparation design; advisory, not published eligibility",
  version: "living-1",
  checkedAt: null,
  quality: "advisory",
};
export const fixtureSource: Provenance = {
  kind: "fixture",
  reference:
    "Fictional Charles University PPE teaching fixture. No real course code, offering or enrolment rule is asserted.",
  url: "https://is.cuni.cz/studium/eng/predmety/",
  version: "ppe-fixture-1",
  checkedAt: null,
  quality: "fictional",
};
export const capabilitySeeds = [
  [
    "statistics",
    "Statistics",
    "Quantitative",
    "https://openstax.org/details/books/introductory-statistics-2e",
  ],
  ["economics", "Economics", "Economics", "https://www.core-econ.org/"],
  ["econometrics", "Econometrics", "Quantitative", "https://ocw.mit.edu/"],
  [
    "political science",
    "Political analysis",
    "Politics",
    "https://www.open.edu/openlearn/",
  ],
  [
    "international relations",
    "International relations",
    "Politics",
    "https://www.open.edu/openlearn/",
  ],
  [
    "Python (computer programming)",
    "Programming",
    "Computing",
    "https://docs.python.org/3/tutorial/",
  ],
  [
    "conduct research",
    "Research methods",
    "Research",
    "https://www.open.edu/openlearn/",
  ],
  [
    "academic writing",
    "Academic writing",
    "Research",
    "https://www.open.edu/openlearn/",
  ],
  [
    "financial analysis",
    "Financial analysis",
    "Economics",
    "https://www.investor.gov/introduction-investing/investing-basics",
  ],
  [
    "tax legislation",
    "Tax expertise",
    "Economics",
    "https://www.oecd.org/tax/",
  ],
  [
    "open source intelligence",
    "OSINT research",
    "Politics",
    "https://www.bellingcat.com/resources/",
  ],
  [
    "entrepreneurship",
    "Entrepreneurship",
    "Enterprise",
    "https://www.open.edu/openlearn/",
  ],
] as const;
export const courseSeeds = [
  {
    slug: "statistics",
    title: "Statistics foundations",
    caps: [0],
    prerequisites: [],
    credits: 6,
    domain: "Quantitative",
  },
  {
    slug: "economics",
    title: "Economic reasoning",
    caps: [1],
    prerequisites: [],
    credits: 6,
    domain: "Economics",
  },
  {
    slug: "politics",
    title: "Political theory and argument",
    caps: [3, 7],
    prerequisites: [],
    credits: 6,
    domain: "Politics",
  },
  {
    slug: "relations",
    title: "International relations",
    caps: [4, 7],
    prerequisites: ["politics"],
    credits: 6,
    domain: "Politics",
  },
  {
    slug: "econometrics",
    title: "Econometrics and evaluation",
    caps: [2, 0],
    prerequisites: ["statistics", "economics"],
    credits: 6,
    domain: "Quantitative",
  },
  {
    slug: "programming",
    title: "Programming for social inquiry",
    caps: [5],
    prerequisites: [],
    credits: 6,
    domain: "Computing",
  },
  {
    slug: "research",
    title: "Research design seminar",
    caps: [6, 7],
    prerequisites: ["statistics"],
    credits: 6,
    domain: "Research",
  },
  {
    slug: "finance",
    title: "Financial statements and valuation",
    caps: [8, 1],
    prerequisites: ["economics"],
    credits: 6,
    domain: "Economics",
  },
  {
    slug: "osint",
    title: "Open-source investigation workshop",
    caps: [10, 4, 7],
    prerequisites: ["relations"],
    credits: 4,
    domain: "Politics",
  },
  {
    slug: "enterprise",
    title: "Entrepreneurial inquiry",
    caps: [11, 8],
    prerequisites: [],
    credits: 4,
    domain: "Enterprise",
  },
] as const;
export const projectSeeds = [
  {
    id: "project:policy",
    title: "Evaluate a public policy",
    caps: [0, 2, 5, 6, 7],
    domain: "Quantitative",
    deliverable:
      "A reproducible notebook, a methods note and a two-page policy brief using a public dataset.",
    criteria:
      "Cite the dataset; distinguish association from causation; document missingness and uncertainty; obtain feedback.",
    resource: "https://data.worldbank.org/",
  },
  {
    id: "project:finance",
    title: "Analyse a public company",
    caps: [8, 1, 0],
    domain: "Economics",
    deliverable:
      "A financial model, an assumptions register and a short investment-neutral analysis of published company accounts.",
    criteria:
      "Trace every number to public filings; compare scenarios; explain limitations. This is a learning project, not investment advice.",
    resource: "https://www.sec.gov/edgar/search/",
  },
  {
    id: "project:risk",
    title: "Build an evidence-led geopolitical brief",
    caps: [10, 4, 7, 1],
    domain: "Politics",
    deliverable:
      "A regional risk brief with a source log, competing hypotheses and explicit confidence statements.",
    criteria:
      "Use lawful public sources, corroborate key claims, protect personal data and separate facts from hypotheses.",
    resource: "https://www.bellingcat.com/resources/",
  },
  {
    id: "project:research",
    title: "Turn professional experience into a research question",
    caps: [9, 6, 7, 0],
    domain: "Research",
    deliverable:
      "An anonymised research proposal, literature map and feasible method using public or lawfully authorised data.",
    criteria:
      "Do not disclose client data; articulate a researchable gap, ethics requirements and a supervisor-feedback plan.",
    resource: "https://www.open.edu/openlearn/",
  },
  {
    id: "project:starter",
    title: "Investigate a question you care about",
    caps: [6, 7, 5],
    domain: "Research",
    deliverable:
      "A short sourced explanation and a small reproducible chart or prototype.",
    criteria:
      "Credit sources, explain one limitation, and ask a teacher or peer to review your reasoning.",
    resource: "https://www.open.edu/openlearn/",
  },
] as const;
export const destinationSeeds = [
  {
    id: "goal:consulting",
    label: "Management consulting",
    query: "management consultant",
    caps: [0, 1, 7, 8],
    projects: ["project:finance", "project:policy"],
    domain: "Enterprise",
  },
  {
    id: "goal:economics",
    label: "Economic and financial analysis",
    query: "economist",
    caps: [0, 1, 2, 5],
    projects: ["project:policy", "project:finance"],
    domain: "Economics",
  },
  {
    id: "goal:risk",
    label: "Geopolitical risk analysis",
    query: "political scientist",
    caps: [3, 4, 10, 7],
    projects: ["project:risk"],
    domain: "Politics",
  },
  {
    id: "goal:diplomacy",
    label: "Diplomacy",
    query: "diplomat",
    caps: [4, 3, 7],
    projects: ["project:risk"],
    domain: "Politics",
  },
  {
    id: "goal:journalism",
    label: "Political journalism",
    query: "journalist",
    caps: [3, 4, 7, 10],
    projects: ["project:risk"],
    domain: "Politics",
  },
  {
    id: "goal:policy",
    label: "Public policy",
    query: "policy analyst",
    caps: [0, 2, 3, 6],
    projects: ["project:policy"],
    domain: "Politics",
  },
  {
    id: "goal:research",
    label: "Academic research",
    query: "university research assistant",
    caps: [0, 6, 7],
    projects: ["project:research", "project:policy"],
    domain: "Research",
  },
  {
    id: "goal:enterprise",
    label: "Entrepreneurship",
    query: "entrepreneur",
    caps: [11, 8, 5],
    projects: ["project:finance", "project:starter"],
    domain: "Enterprise",
  },
] as const;
