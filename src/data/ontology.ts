import type { Destination, Profile, Skill } from "@/lib/types";
const mdn = "https://developer.mozilla.org/en-US/docs/Learn_web_development";
// Locally authored learning graph. These are stable Syrka IDs, NOT purported ESCO IDs.
export const skills: Skill[] = [
  {
    id: "research",
    name: "User research",
    description:
      "Plan an ethical study, listen to users and turn observations into supported findings.",
    prerequisites: [],
    hours: [12, 24],
    resources: [
      {
        title: "GOV.UK: user research",
        url: "https://www.gov.uk/service-manual/user-research",
      },
    ],
    evidence:
      "A research plan, consented anonymized notes and a synthesis reviewed by a mentor.",
    source: "https://www.gov.uk/service-manual/user-research",
  },
  {
    id: "data",
    name: "Data literacy",
    description:
      "Read, question and communicate data while recognizing bias and uncertainty.",
    prerequisites: [],
    hours: [12, 20],
    resources: [
      {
        title: "OpenLearn: data analysis",
        url: "https://www.open.edu/openlearn/science-maths-technology/learn-code-data-analysis/content-section-overview",
      },
    ],
    evidence:
      "A reproducible analysis with a clear account of assumptions and limitations.",
    source: "https://www.open.edu/openlearn/",
  },
  {
    id: "design",
    name: "Interaction design",
    description:
      "Create understandable flows, accessible interfaces and testable prototypes.",
    prerequisites: ["research"],
    hours: [20, 40],
    resources: [
      {
        title: "GOV.UK: design",
        url: "https://www.gov.uk/service-manual/design",
      },
    ],
    evidence:
      "An accessible prototype and a usability report explaining design decisions.",
    source: "https://www.gov.uk/service-manual/design",
  },
  {
    id: "html",
    name: "Semantic HTML & CSS",
    description:
      "Build responsive pages with meaningful structure and accessible controls.",
    prerequisites: [],
    hours: [16, 32],
    resources: [{ title: "MDN: web development", url: mdn }],
    evidence:
      "A responsive, keyboard-accessible page with documented accessibility checks.",
    source: mdn,
  },
  {
    id: "js",
    name: "JavaScript foundations",
    description:
      "Use functions, data structures and asynchronous operations to create interactive experiences.",
    prerequisites: ["html"],
    hours: [24, 48],
    resources: [
      {
        title: "MDN: JavaScript",
        url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide",
      },
    ],
    evidence:
      "A working interactive application with tests for its core behavior.",
    source: mdn,
  },
  {
    id: "react",
    name: "React development",
    description:
      "Compose reusable interfaces and manage state, events and data boundaries.",
    prerequisites: ["js"],
    hours: [24, 48],
    resources: [{ title: "React: learn", url: "https://react.dev/learn" }],
    evidence:
      "An application with reusable components, state management and integration tests.",
    source: "https://react.dev/learn",
  },
  {
    id: "sql",
    name: "SQL & data modeling",
    description: "Model relationships and query data accurately and safely.",
    prerequisites: ["data"],
    hours: [20, 36],
    resources: [
      {
        title: "PostgreSQL tutorial",
        url: "https://www.postgresql.org/docs/current/tutorial.html",
      },
    ],
    evidence:
      "A normalized schema, meaningful queries and checks for data integrity.",
    source: "https://www.postgresql.org/docs/current/tutorial.html",
  },
  {
    id: "python",
    name: "Python analysis",
    description: "Clean and analyze data with reproducible Python workflows.",
    prerequisites: ["data"],
    hours: [24, 40],
    resources: [
      { title: "Python tutorial", url: "https://docs.python.org/3/tutorial/" },
    ],
    evidence:
      "A reproducible notebook with validation, interpretation and limitations.",
    source: "https://docs.python.org/3/tutorial/",
  },
  {
    id: "accessibility",
    name: "Accessible experiences",
    description:
      "Evaluate interfaces with keyboard, screen reader and contrast checks.",
    prerequisites: ["html"],
    hours: [12, 24],
    resources: [
      {
        title: "W3C: accessibility fundamentals",
        url: "https://www.w3.org/WAI/fundamentals/",
      },
    ],
    evidence: "An accessibility review with fixes and a record of testing.",
    source: "https://www.w3.org/WAI/fundamentals/",
  },
  {
    id: "storytelling",
    name: "Communicating insights",
    description:
      "Explain findings clearly and distinguish evidence from interpretation.",
    prerequisites: ["data"],
    hours: [8, 16],
    resources: [
      {
        title: "Government Analysis Function: visualization",
        url: "https://analysisfunction.civilservice.gov.uk/policy-store/data-visualisation-charts/",
      },
    ],
    evidence:
      "A concise findings presentation with sources and explicit uncertainty.",
    source:
      "https://analysisfunction.civilservice.gov.uk/policy-store/data-visualisation-charts/",
  },
];
export const destinations: Destination[] = [
  {
    id: "product-designer",
    name: "Product designer",
    field: "Design & research",
    description:
      "Turn an understanding of people into useful, accessible digital experiences.",
    skills: ["research", "design", "accessibility", "storytelling"],
    source: "https://esco.ec.europa.eu/en/classification/occupation_main",
  },
  {
    id: "frontend-developer",
    name: "Front-end developer",
    field: "Technology",
    description:
      "Build thoughtful, responsive interfaces that people can use with confidence.",
    skills: ["html", "js", "react", "accessibility"],
    source: "https://developer.mozilla.org/en-US/docs/Learn_web_development",
  },
  {
    id: "data-analyst",
    name: "Data analyst",
    field: "Data & insights",
    description:
      "Find patterns in data and help teams make informed decisions.",
    skills: ["data", "sql", "python", "storytelling"],
    source: "https://www.open.edu/openlearn/",
  },
];
export const demoProfile: Profile = {
  id: "fictional-alex",
  name: "Alex Morgan",
  headline: "Exploring the space between design and technology",
  fictional: true,
  hoursPerWeek: 6,
  evidence: [
    {
      id: "e1",
      skillId: "research",
      title: "Fictional community research project",
      verification: "document-supported",
      sourceSystem: "syrka-demo",
      sourceRecordId: "project-01",
      issuer: "Fictional learning studio",
      reference: "demo:research-summary",
      timestamp: "2026-09-01T00:00:00Z",
      consent: true,
    },
    {
      id: "e2",
      skillId: "data",
      title: "Fictional introductory data course",
      verification: "document-supported",
      sourceSystem: "syrka-demo",
      sourceRecordId: "course-01",
      issuer: "Fictional learning studio",
      reference: "demo:data-assignment",
      timestamp: "2026-09-02T00:00:00Z",
      consent: true,
    },
    {
      id: "e3",
      skillId: "html",
      title: "Personal website experience",
      verification: "self-reported",
      sourceSystem: "syrka-demo",
      sourceRecordId: "claim-01",
      timestamp: "2026-09-03T00:00:00Z",
      consent: true,
    },
    {
      id: "e4",
      skillId: "storytelling",
      title: "Candidate skill from project description",
      verification: "inferred",
      sourceSystem: "syrka-demo",
      sourceRecordId: "inference-01",
      timestamp: "2026-09-03T00:00:00Z",
      consent: true,
    },
  ],
};
export const skillById = Object.fromEntries(skills.map((s) => [s.id, s]));
