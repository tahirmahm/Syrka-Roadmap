import type { Catalogue, Workspace } from "../odyssey/types";
import { buildRoadmap } from "../odyssey/graph";
import { capabilityBrain } from "../odyssey/capability-model";
import {
  discover,
  normalize,
  searchOccupations,
  relatedOccupations,
} from "../odyssey/catalogue";
import {
  capabilitySeeds,
  courseSeeds,
  projectSeeds,
  destinationSeeds,
  editorial,
  fixtureSource,
} from "./seeds";
import { detectCourseCycles } from "./catalogue";
import {
  emptyLiving,
  type WorldGraph,
  type WorldNode,
  type WorldEdge,
  type Relation,
  type Provenance,
  type LivingState,
  type CourseRecord,
} from "./schema";
const indices = new WeakMap<
  Catalogue,
  {
    skills: Map<string, Catalogue["skills"][number]>;
    labels: Map<string, Catalogue["skills"][number]>;
    queries: Map<string, Catalogue["occupations"][number] | undefined>;
    related: Map<string, ReturnType<typeof relatedOccupations>>;
    topics: Map<string, ReturnType<typeof buildRoadmap>["topics"]>;
  }
>();
function sourceIndex(data: Catalogue) {
  let i = indices.get(data);
  if (!i) {
    i = {
      skills: new Map(data.skills.map((s) => [s.id, s])),
      labels: new Map(data.skills.map((s) => [normalize(s.label), s])),
      queries: new Map(),
      related: new Map(),
      topics: new Map(),
    };
    indices.set(data, i);
  }
  return i;
}
export function buildWorld(w: Workspace, data: Catalogue): WorldGraph {
  const index = sourceIndex(data);
  const state = w.living || emptyLiving(),
    brain = capabilityBrain(w.person),
    nodes = new Map<string, WorldNode>(),
    edges = new Map<string, WorldEdge>();
  const base = (
    id: string,
    label: string,
    kind: WorldNode["kind"],
    summary: string,
    domain: string,
    source = editorial,
  ): WorldNode => ({
    id,
    label,
    kind,
    summary,
    domain,
    source,
    requirement: "advisory",
    status: "available",
    skillIds: [],
    evidence: [],
    actions: [],
    prerequisites: [],
  });
  const add = (n: WorldNode) => {
    if (!nodes.has(n.id)) nodes.set(n.id, n);
    return nodes.get(n.id)!;
  };
  const link = (
    from: string,
    to: string,
    relation: Relation,
    rationale: string,
    source = editorial,
    requirement: "formal" | "advisory" = "advisory",
  ) => {
    const id = [from, relation, to].join("|");
    edges.set(id, { id, from, to, relation, rationale, source, requirement });
  };
  const person = add(
    base(
      "person",
      w.person.name,
      "PersonProfile",
      w.person.headline,
      "Foundation",
      {
        ...editorial,
        kind: "self-reported",
        reference: "Your reviewed Passport records",
      },
    ),
  );
  person.evidence = brain.experiences.map((c) => ({
    id: c.id,
    text: c.text,
    quote: c.quote,
    status: "user-reviewed",
    date: c.dates,
  }));
  function capability(skillId: string, label?: string) {
    const s = index.skills.get(skillId);
    const source: Provenance = s
      ? {
          kind: "esco",
          reference: s.source.recordId,
          url: s.source.url,
          version: s.source.version,
          checkedAt: null,
          quality: "source-backed",
        }
      : editorial;
    const n = add(
      base(
        s ? "cap:" + s.id : skillId,
        label || s?.label || skillId,
        s ? "Capability" : "KnowledgeDomain",
        s?.description ||
          "Suggested subject area; no institutional course offering or mastery is asserted.",
        "Capabilities",
        source,
      ),
    );
    n.skillIds = s ? [s.id] : [];
    n.evidence = brain.capabilities
      .filter((a) => n.skillIds.includes(a.capabilityId))
      .map((a) => ({
        id: a.evidenceId,
        text: a.evidence.text,
        quote: a.evidence.quote,
        status: a.status,
      }));
    if (n.evidence.length) {
      n.status = n.evidence.some((a) =>
        ["institution-verified", "employer-verified"].includes(a.status),
      )
        ? "verified"
        : n.evidence.some((a) => a.status !== "inferred")
          ? "reported"
          : "inferred";
      link(
        "person",
        n.id,
        n.status === "inferred" ? "RELATED_TO" : "DEMONSTRATES",
        n.status === "inferred"
          ? "Candidate mapping awaits human review; it does not demonstrate this capability."
          : "Supporting claim; scope and verification are shown in the evidence panel.",
        {
          kind: n.evidence.some((e) =>
            [
              "document-supported",
              "institution-verified",
              "employer-verified",
            ].includes(e.status),
          )
            ? "user-document"
            : "self-reported",
          reference: n.evidence
            .map((a) => a.id)
            .join(", ")
            .slice(0, 2000),
          version: "syrka.capabilities/1",
          checkedAt: null,
          quality: n.evidence.some((e) =>
            [
              "document-supported",
              "institution-verified",
              "employer-verified",
            ].includes(e.status),
          )
            ? "document-supported"
            : "advisory",
        },
      );
    }
    n.actions = [
      {
        title: "Demonstrate " + n.label,
        deliverable:
          "An artifact applying this capability to a specific problem, with sources and a short explanation.",
        criteria:
          "Document your approach, result and limitations; obtain feedback. Self-completion does not verify proficiency.",
        resource: "https://www.open.edu/openlearn/",
      },
    ];
    return n;
  }
  const caps = capabilitySeeds.map(([query, label, domain, url]) => {
    const s = data.skills.find((s) => normalize(s.label) === normalize(query));
    const n = capability(
      s?.id || "subject:" + normalize(query).replaceAll(" ", "-"),
      label,
    );
    n.domain = domain;
    n.actions[0].resource = url;
    return n;
  });
  // The existing capability projection remains the single source of personal evidence.
  for (const a of brain.capabilities.slice(0, 120))
    if (index.skills.has(a.capabilityId)) capability(a.capabilityId);
  const hasAcademic = w.person.courses.length > 0 || !!state.academic;
  if (hasAcademic || w.person.fictional) {
    const n = add(
      base(
        "programme",
        state.academic?.programme || "Academic foundation",
        "AcademicProgramme",
        state.academic
          ? `${state.academic.institution} · ${state.academic.level} · ${state.academic.year}`
          : "Review your programme, current courses and outcomes.",
        "Foundation",
        w.person.fictional ? fixtureSource : editorial,
      ),
    );
    n.institution = state.academic?.institution;
    n.status =
      state.academic || w.person.courses.some((c) => c.status === "in-progress")
        ? "working"
        : "historical";
    n.summary +=
      " This groups your reported academic context; it is not an awarded qualification or an automatically selected future destination.";
    link(
      "person",
      n.id,
      "RELATED_TO",
      "Programme reported in your reviewed academic record.",
    );
  }
  const catalog =
    state.catalogue?.courses ||
    (w.person.fictional
      ? courseSeeds.map((c) => ({
          id: "course:" + c.slug,
          institution: "Charles University — fictional PPE demonstration",
          programme: "PPE teaching fixture",
          code: null,
          title: c.title,
          credits: c.credits,
          language: "English (fixture)",
          term: "Next semester (fixture)",
          outcomes: c.caps.map(
            (i) =>
              `Develop and demonstrate ${caps[i].label} through assessed work (fictional outcome).`,
          ),
          skillIds: c.caps.flatMap((i) => caps[i].skillIds),
          prerequisites: c.prerequisites.map((id) => "course:" + id),
          restrictions: [
            "Illustrative catalogue only; check the official SIS before any enrolment.",
          ],
          availability: "fixture" as const,
          schedule: [],
          source: fixtureSource,
        }))
      : []);
  detectCourseCycles(catalog);
  for (const c of catalog)
    if (c.skillIds.some((id) => !index.skills.has(id)))
      throw new Error("Unknown capability ID in course catalogue");
  for (const c of catalog) {
    const n = add(
      base(
        c.id,
        c.title,
        "UniversityCourse",
        c.outcomes.join(" ") ||
          "Imported course description; learning outcomes need review.",
        "Academic",
        c.source,
      ),
    );
    n.institution = c.institution;
    n.skillIds = c.skillIds;
    n.prerequisites = c.prerequisites;
    n.credits = c.credits;
    n.requirement = c.source.kind === "fixture" ? "advisory" : "unknown";
    n.actions = [
      {
        title: "Review course eligibility and assessment",
        deliverable:
          "Check official term availability, prerequisites, credits and assessment criteria before enrolling.",
        criteria:
          c.restrictions.join(" ") ||
          "Enrolment eligibility has not been independently checked.",
        resource: c.source.url,
      },
    ];
    if (nodes.has("programme"))
      link(
        "programme",
        n.id,
        "RELATED_TO",
        "Course catalogue relationship; not proof of enrolment.",
        c.source,
      );
    const linkedRecord = w.person.courses.find(
      (record) => record.id === state.courseLinks?.[c.id],
    );
    if (linkedRecord) {
      n.evidence.push({
        id: linkedRecord.id,
        text: linkedRecord.title,
        quote: linkedRecord.outcomes.map((o) => o.quote).join(" "),
        status: linkedRecord.verification,
      });
      if (linkedRecord.status === "reported-complete") n.status = "reported";
      else if (linkedRecord.status === "in-progress") n.status = "working";
    }
    c.prerequisites.forEach((id) =>
      link(
        id,
        n.id,
        "REQUIRES",
        "Prerequisite in the supplied catalogue. Fixture rules are fictional; imported rules require official confirmation.",
        c.source,
        c.source.kind === "fixture" ? "advisory" : "formal",
      ),
    );
    const seed = courseSeeds.find((s) => "course:" + s.slug === c.id);
    const targetCaps = c.skillIds
      .map((id) => capability(id))
      .concat(
        c.source.kind === "fixture" && seed
          ? seed.caps.map((i) => caps[i])
          : [],
      );
    for (const cap of targetCaps)
      link(
        n.id,
        cap.id,
        "DEVELOPS",
        "Documented learning outcome supports studying this capability, not proof of mastery.",
        c.source,
      );
  }
  for (const c of w.person.courses) {
    const existing =
      (nodes.get(c.id)?.kind === "UniversityCourse"
        ? nodes.get(c.id)
        : undefined) ||
      add(
        base(
          "record-course:" + c.id,
          c.title,
          "UniversityCourse",
          c.outcomes.map((o) => o.text).join(" ") ||
            "Reported course; a title alone does not establish mastery.",
          "History",
          {
            kind: "user-document",
            reference: c.sourceRecordId,
            version: "personal-1",
            checkedAt: null,
            quality: "document-supported",
          },
        ),
      );
    existing.status =
      c.status === "in-progress"
        ? "working"
        : c.status === "reported-complete"
          ? "reported"
          : "available";
    existing.institution = c.institution;
    existing.evidence.push({
      id: c.id,
      text:
        c.title +
        (c.grade ? " · Reported grade: " + c.grade : "") +
        (c.credits !== undefined ? " · Reported credits: " + c.credits : ""),
      quote: c.outcomes.map((o) => o.quote).join(" "),
      status: c.verification,
    });
    link(
      "person",
      existing.id,
      "RELATED_TO",
      "Recorded coursework; completion is user/document reported.",
      existing.source,
    );
    for (const o of c.outcomes)
      for (const id of o.skillIds)
        link(
          existing.id,
          capability(id).id,
          "DEVELOPS",
          o.text,
          existing.source,
        );
  }
  for (const p of projectSeeds) {
    const n = add(base(p.id, p.title, "Project", p.deliverable, p.domain));
    n.skillIds = p.caps.flatMap((i) => caps[i].skillIds);
    n.actions = [
      {
        title: p.title,
        deliverable: p.deliverable,
        criteria: p.criteria,
        resource: p.resource,
      },
    ];
    p.caps.forEach((i) =>
      link(
        caps[i].id,
        n.id,
        "RECOMMENDED_PREPARATION",
        "Useful preparation for the project, not a compulsory credential.",
      ),
    );
  }
  const goalIds = new Set(
    [...state.goals, ...state.expanded]
      .filter((id) => id.startsWith("occupation:"))
      .map((id) => id.slice(11)),
  );
  const extra = discover(data, w.person, 4).map((m) => m.occupation);
  for (const id of goalIds) {
    const o = data.occupations.find((o) => o.id === id);
    if (o && !extra.some((x) => x.id === id)) extra.push(o);
  }
  function occupation(
    id: string,
    label: string,
    query: string,
    domain: string,
    capIndices: readonly number[] = [],
    projects: readonly string[] = [],
  ) {
    if (!index.queries.has(query))
      index.queries.set(query, searchOccupations(data, query, "", 1)[0]);
    const o = index.queries.get(query);
    const source: Provenance = o
      ? {
          kind: "esco",
          reference: o.source.recordId,
          url: o.source.url,
          version: o.source.version,
          checkedAt: null,
          quality: "source-backed",
        }
      : editorial;
    const n = add(
      base(
        id,
        label,
        "Occupation",
        o?.description ||
          "Exploration direction; occupation equivalence and requirements need review.",
        domain,
        source,
      ),
    );
    n.occupationId = o?.id;
    n.requirement = "unknown";
    n.skillIds = o?.essential || [];
    capIndices.forEach((i) =>
      link(
        caps[i].id,
        n.id,
        "CONTRIBUTES_TO",
        "Editorial preparation connection; shared capability, not verified eligibility.",
      ),
    );
    projects.forEach((p) =>
      link(
        p,
        n.id,
        "CONTRIBUTES_TO",
        "This suggested project can demonstrate transferable preparation. It is not a hiring requirement.",
      ),
    );
    for (const skillId of (o?.essential || []).slice(0, 18)) {
      const cap = capability(skillId);
      link(
        cap.id,
        n.id,
        "CONTRIBUTES_TO",
        "ESCO essential-skill relationship; this is not a legal, licensing or employer-specific rule.",
        source,
      );
    }
    n.actions = [
      {
        title: "Inspect preparation and actual entry rules",
        deliverable:
          "Compare your evidence with the role's published requirements, then choose a learning or evidence task.",
        criteria:
          "Confirm location, recruitment route, formal qualifications and current availability at an official source.",
        resource: o?.source.url,
      },
    ];
    if (o) {
      if (!index.related.has(o.id))
        index.related.set(o.id, relatedOccupations(data, o.id, 2));
      for (const r of index.related.get(o.id) || []) {
        const id = "occupation:" + r.occupation.id;
        if (id === n.id) continue;
        const target = add(
          base(
            id,
            r.occupation.label,
            "Occupation",
            r.occupation.description,
            r.occupation.domain,
            {
              kind: "esco",
              reference: r.occupation.source.recordId,
              url: r.occupation.source.url,
              version: r.occupation.source.version,
              checkedAt: null,
              quality: "source-backed",
            },
          ),
        );
        target.occupationId = r.occupation.id;
        target.requirement = "unknown";
        target.skillIds = r.occupation.essential;
        target.actions = [
          {
            title: "Explore the adjacent destination",
            deliverable:
              "Expand its source requirements and compare your evidence before choosing a route.",
            criteria:
              "Shared skills imply neither promotion nor formal eligibility.",
            resource: target.source.url,
          },
        ];
        link(
          n.id,
          id,
          "TRANSFERABLE_TO",
          `${r.shared} shared essential source skills. This is inferred occupational adjacency, not guaranteed progression or eligibility.`,
          {
            ...editorial,
            reference: "Computed ESCO essential-skill overlap",
            version: data.version,
          },
        );
      }
    }
    return n;
  }
  destinationSeeds.forEach((d) =>
    occupation(d.id, d.label, d.query, d.domain, d.caps, d.projects),
  );
  extra.forEach((o, i) => {
    occupation("occupation:" + o.id, o.label, o.label, o.domain).discoveryRank =
      i;
  });
  const mck = add(
    base(
      "goal:mckinsey",
      "McKinsey · Business Analyst",
      "EmployerRole",
      "Employer-specific exploration target. Office, recruitment route, current vacancy and formal eligibility have NOT been verified.",
      "Enterprise",
      {
        ...editorial,
        url: "https://www.mckinsey.com/careers",
        reference:
          "Official careers discovery link; no vacancy or current role requirements retrieved",
      },
    ),
  );
  mck.requirement = "unknown";
  link(
    "goal:consulting",
    mck.id,
    "RELATED_TO",
    "A specific employer to investigate; not an open vacancy or guarantee.",
  );
  [0, 1, 7, 8].forEach((i) =>
    link(
      caps[i].id,
      mck.id,
      "RECOMMENDED_PREPARATION",
      "Advisory analytical preparation, not a published McKinsey requirement.",
    ),
  );
  link(
    "project:finance",
    mck.id,
    "CONTRIBUTES_TO",
    "A financial analysis artifact can be reviewed as preparation; no claim about employer screening.",
  );
  const recruitment = add(
    base(
      "quest:recruitment",
      "Investigate an actual recruitment route",
      "ProgressMilestone",
      "Choose an office and published role, record its URL and date, then compare only the stated requirements.",
      "Enterprise",
    ),
  );
  recruitment.actions = [
    {
      title: "Verify the recruitment source",
      deliverable:
        "A dated source note containing the office, role, route, published requirements and unknowns.",
      criteria:
        "No invented vacancy, deadline or eligibility. Seek official confirmation where ambiguous.",
      resource: "https://www.mckinsey.com/careers",
    },
  ];
  link(
    recruitment.id,
    mck.id,
    "RECOMMENDED_PREPARATION",
    "Source verification is an application-preparation task, not a hiring prerequisite.",
  );
  const mba = add(
    base(
      "goal:mba",
      "Harvard Business School · MBA",
      "GraduateProgramme",
      "A graduate application exploration target. Current admissions, tests, fees and dates are unverified; inspect the official admissions source.",
      "Graduate study",
      {
        ...editorial,
        url: "https://www.hbs.edu/mba/admissions",
        reference:
          "Official admissions discovery link; current rules not retrieved",
      },
    ),
  );
  mba.requirement = "unknown";
  mba.actions = [
    {
      title: "Build an admissions preparation dossier",
      deliverable:
        "Review the official MBA admissions pages and record current published criteria, your supporting academic/professional evidence and unresolved questions.",
      criteria:
        "Check the actual application cycle and programme rules. No employment history is a required or sufficient admission condition unless explicitly published.",
      resource: mba.source.url,
    },
  ];
  const admissions = add(
    base(
      "quest:admissions",
      "Verify graduate admissions and prepare evidence",
      "ProgressMilestone",
      "Record current programme requirements and map your evidence without assuming admission.",
      "Graduate study",
      { ...editorial, url: "https://www.hbs.edu/mba/admissions" },
    ),
  );
  admissions.actions = mba.actions;
  link(
    admissions.id,
    mba.id,
    "RECOMMENDED_PREPARATION",
    "Source verification and evidence review before choosing an application route.",
  );
  link(
    mck.id,
    mba.id,
    "SUPPORTS_APPLICATION_TO",
    "Relevant professional experience may support an application. McKinsey employment is neither required nor sufficient for MBA admission.",
  );
  const strategy = occupation(
    "goal:strategy",
    "Corporate strategy exploration",
    "business manager",
    "Enterprise",
    [1, 8, 11],
    ["project:finance"],
  );
  link(
    mba.id,
    strategy.id,
    "RELATED_TO",
    "Graduate study and prior professional experience can motivate a strategy career; the MBA is not assumed required or sufficient.",
  );
  link(
    strategy.id,
    "goal:enterprise",
    "TRANSFERABLE_TO",
    "Strategy experience may inform entrepreneurship. This is advisory, not a prescribed sequence.",
  );
  link(
    mba.id,
    "goal:enterprise",
    "ALTERNATIVE_PATH_TO",
    "Entrepreneurship is another possible future; a particular degree is not assumed mandatory.",
  );
  link(
    "goal:consulting",
    mba.id,
    "ALTERNATIVE_PATH_TO",
    "Consulting is only one possible background; alternative professional histories may also be relevant.",
  );
  link(
    "goal:enterprise",
    mba.id,
    "ALTERNATIVE_PATH_TO",
    "Entrepreneurial experience is another background to discuss with admissions; no eligibility is asserted.",
  );
  const masters = add(
    base(
      "goal:masters",
      "Research master's exploration",
      "GraduateProgramme",
      "Investigate subject fit, methodology preparation and current university-specific admissions. No acceptance or degree equivalence is implied.",
      "Graduate study",
      { ...editorial, url: "https://fsv.cuni.cz/en/admissions" },
    ),
  );
  masters.requirement = "unknown";
  const doctoral = add(
    base(
      "goal:doctoral",
      "Doctoral research transition",
      "ResearchPathway",
      "Build from prior expertise. Investigate research fit, supervision and degree-equivalence rules; do not assume a second undergraduate degree is necessary.",
      "Research",
      { ...editorial, url: "https://cuni.cz/UKEN-5.html" },
    ),
  );
  doctoral.requirement = "unknown";
  doctoral.actions = [
    {
      title: "Investigate a research transition",
      deliverable:
        "Map your existing expertise to a research question, identify potential supervisors and check actual institutional entry/degree-equivalence rules.",
      criteria:
        "Do not assume repeating an undergraduate degree is necessary. Obtain official confirmation before selecting a qualification route.",
      resource: doctoral.source.url,
    },
  ];
  link(
    caps[6].id,
    doctoral.id,
    "RECOMMENDED_PREPARATION",
    "Research-method preparation can strengthen a proposal; this is not a published admission rule.",
  );
  link(
    caps[7].id,
    doctoral.id,
    "RECOMMENDED_PREPARATION",
    "Academic writing helps communicate a research contribution; formal requirements remain unknown.",
  );
  const internship = add(
    base(
      "opportunity:internship",
      "Explore relevant internships",
      "Opportunity",
      "Discovery target only; no current vacancy, deadline or eligibility has been verified.",
      "Enterprise",
      { ...editorial, url: "https://www.mckinsey.com/careers" },
    ),
  );
  internship.requirement = "unknown";
  internship.actions = [
    {
      title: "Find and check an actual opportunity",
      deliverable:
        "A saved official source URL, verification date, role/office and a requirements-to-evidence comparison.",
      criteria:
        "Only call it an open application after checking current availability and official eligibility.",
      resource: internship.source.url,
    },
  ];
  link(
    internship.id,
    "goal:consulting",
    "RECOMMENDED_PREPARATION",
    "Relevant experience may contribute to career exploration, but an internship is not assumed mandatory.",
  );
  link(
    "goal:risk",
    masters.id,
    "SUPPORTS_APPLICATION_TO",
    "A well-evidenced analytical background may help explain research interests; not an admissions rule.",
  );
  link(
    "project:research",
    masters.id,
    "RECOMMENDED_PREPARATION",
    "A proposal helps explore research fit.",
  );
  link(
    masters.id,
    doctoral.id,
    "ALTERNATIVE_PATH_TO",
    "A relevant graduate route is one possible path, subject to actual institutional rules.",
  );
  link(
    "project:research",
    doctoral.id,
    "RECOMMENDED_PREPARATION",
    "Professional expertise can motivate research; formal admissions requirements remain unknown.",
  );
  link(
    doctoral.id,
    "goal:research",
    "RELATED_TO",
    "Research training and academic roles have separate requirements.",
  );
  const tax = occupation(
    "goal:tax",
    "Tax advisory experience",
    "tax advisor",
    "Economics",
    [9, 8, 7],
    ["project:research"],
  );
  link(
    tax.id,
    "project:research",
    "TRANSFERABLE_TO",
    "Tax expertise can motivate research questions. It does not replace methodology or admissions requirements.",
  );
  link(
    caps[9].id,
    doctoral.id,
    "CONTRIBUTES_TO",
    "Existing subject expertise may remain relevant during respecialisation; not degree equivalence.",
  );
  const history = w.person.claims.filter(
    (c) =>
      c.approved &&
      [
        "employment",
        "internship",
        "education",
        "qualification",
        "project",
        "publication",
      ].includes(c.kind),
  );
  for (const c of history) {
    const kind: WorldNode["kind"] =
      c.kind === "internship"
        ? "Internship"
        : c.kind === "employment"
          ? "ProfessionalExperience"
          : c.kind === "qualification"
            ? "Credential"
            : c.kind === "education"
              ? "AcademicProgramme"
              : c.kind === "project"
                ? "Project"
                : "ResearchPathway";
    const n = add(
      base("evidence:" + c.id, c.text.slice(0, 90), kind, c.text, "History", {
        kind: "user-document",
        reference: c.id,
        version: "personal-1",
        checkedAt: null,
        quality: w.person.fictional ? "fictional" : "document-supported",
      }),
    );
    n.status = c.educationState === "current" ? "working" : "historical";
    if (["education", "qualification"].includes(c.kind)) {
      n.summary += ` Education status: ${c.educationState || "unknown"}. Attendance, transfer and incomplete study do not establish a completed qualification. Institution verification is not implied.`;
      if (c.educationState !== "completed" && n.kind === "Credential")
        n.kind = "AcademicProgramme";
    }
    n.date = c.dates;
    n.evidence = [
      {
        id: c.id,
        text: c.text,
        quote: c.quote,
        status: "user-reviewed",
        date: c.dates,
      },
    ];
    n.skillIds = c.mappings.filter((m) => m.selected).map((m) => m.skillId);
    link(
      "person",
      n.id,
      "RELATED_TO",
      "Preserved historical record; inspecting a new goal never removes it.",
      n.source,
    );
    for (const id of n.skillIds)
      link(
        n.id,
        capability(id).id,
        c.mappings.some(
          (m) =>
            (m.skillId === id || "cap:" + m.skillId === id) &&
            (m.confirmed || ["exact", "alias"].includes(m.method)),
        )
          ? "DEMONSTRATES"
          : "RELATED_TO",
        "User-reviewed evidence association; candidate mappings are advisory, not independent verification.",
        n.source,
      );
  }
  // Project legacy learning milestones without turning checkboxes into capability claims.
  let legacyVisible = 0;
  const legacyTotal = w.paths.reduce((n, p) => n + p.completed.length, 0);
  for (const path of [...w.paths].sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt),
  )) {
    if (legacyVisible >= 500) break;
    const o = data.occupations.find((o) => o.id === path.occupationId);
    if (o && !index.topics.has(o.id))
      index.topics.set(
        o.id,
        buildRoadmap(
          o,
          data.skills.filter(
            (s) => o.essential.includes(s.id) || o.optional.includes(s.id),
          ),
          [],
        ).topics,
      );
    const topics = o ? index.topics.get(o.id) || [] : [];
    const target = o
      ? add(
          base(
            "occupation:" + o.id,
            o.label,
            "Occupation",
            o.description,
            o.domain,
            {
              kind: "esco",
              reference: o.source.recordId,
              url: o.source.url,
              version: o.source.version,
              checkedAt: null,
              quality: "source-backed",
            },
          ),
        )
      : null;
    if (target) {
      target.occupationId = o!.id;
      target.requirement = "unknown";
      target.skillIds = o!.essential;
    }
    for (const id of path.completed) {
      if (legacyVisible >= 500) break;
      legacyVisible++;
      const topic = topics.find((t) => t.id === id),
        source: Provenance = {
          kind: "self-reported",
          reference: "Recovery roadmap " + path.id,
          version: "workspace-2",
          checkedAt: null,
          quality: "advisory",
        };
      const n = add(
        base(
          "legacy-progress:" + path.id + ":" + id,
          (topic?.label || id) + " · " + path.title,
          "ProgressMilestone",
          `Previously self-recorded learning milestone. Original completion date was not stored; roadmap last saved ${path.updatedAt}. Completion does not establish verified proficiency.`,
          "History",
          source,
        ),
      );
      n.status = "historical";
      n.skillIds = topic?.skillIds || [];
      const notes = (path.evidenceNotes || [])
        .filter((note) => note.topicId === id)
        .map((note) => note.note)
        .join(" ");
      n.evidence = [
        {
          id: path.id + ":" + id,
          text:
            notes ||
            "Self-recorded topic completion; supporting evidence still needs review.",
          quote: notes,
          status: "self-reported",
        },
      ];
      n.actions = [
        {
          title: "Review the old learning milestone",
          deliverable:
            "Open the detailed roadmap, inspect any artifact or note and record what the evidence actually demonstrates.",
          criteria:
            "The original date and verified proficiency must not be inferred from a checkbox.",
        },
      ];
      link(
        "person",
        n.id,
        "RELATED_TO",
        "Preserved recovery-branch learning history.",
        source,
      );
      for (const skillId of n.skillIds)
        if (index.skills.has(skillId))
          link(
            n.id,
            capability(skillId).id,
            "RELATED_TO",
            "This topic concerns the capability, but self-marked completion alone does not demonstrate mastery.",
            source,
          );
      if (target)
        link(
          n.id,
          target.id,
          "CONTRIBUTES_TO",
          "Self-recorded learning toward this destination, not verified requirement satisfaction.",
          source,
        );
    }
  }
  for (const p of state.progress) {
    const n = nodes.get(p.nodeId);
    if (n) {
      n.status =
        p.status === "completed"
          ? "reported"
          : p.status === "working"
            ? "working"
            : "planned";
      n.evidence.push({
        id: "progress:" + p.nodeId,
        text:
          p.evidence ||
          "Self-marked progress; supporting evidence still needed.",
        quote: p.evidence,
        status: "self-reported",
        date: p.at,
      });
    }
  }
  for (const id of state.expanded) {
    const n = nodes.get(id);
    if (n?.status === "available" && !state.goals.includes(id))
      n.status = "explored";
  }
  state.plannedCourses.forEach((id) => {
    const n = nodes.get(id);
    if (n && !["reported", "verified"].includes(n.status)) n.status = "planned";
  });
  for (const n of nodes.values())
    if (
      n.prerequisites.length &&
      !n.prerequisites.every((id) =>
        ["reported", "verified"].includes(nodes.get(id)?.status || ""),
      ) &&
      n.status === "available"
    )
      n.status = "prerequisites";
  for (const r of state.advisoryRelationships || []) {
    const claim = w.person.claims.find((c) => c.id === r.claimId && c.approved);
    if (
      !claim ||
      !claim.quote.includes(r.quote) ||
      !nodes.has(r.from) ||
      !nodes.has(r.to) ||
      r.from === r.to
    )
      continue;
    if (
      ![r.from, r.to].some(
        (id) =>
          id === "evidence:" + claim.id ||
          claim.mappings.some(
            (m) =>
              m.selected && (m.skillId === id || "cap:" + m.skillId === id),
          ),
      )
    )
      continue;
    if (
      /\b(must|required|mandatory|guaranteed|eligible|admitted)\b/i.test(
        r.rationale,
      )
    )
      continue;
    link(
      r.from,
      r.to,
      r.relation,
      "AI-suggested, user-accepted advisory association: " + r.rationale,
      {
        kind: "self-reported",
        reference: "Reviewed candidate from claim " + claim.id,
        version: "ai-advisory-1",
        checkedAt: null,
        quality: "advisory",
      },
    );
  }
  const validEdges = [...edges.values()].filter(
    (e) => nodes.has(e.from) && nodes.has(e.to),
  );
  return {
    version: "syrka.living/1",
    nodes: [...nodes.values()],
    edges: validEdges,
    notice:
      (legacyTotal > legacyVisible
        ? `Showing ${legacyVisible} of ${legacyTotal} old milestones; all original records remain in My Roadmaps. `
        : "") +
      (w.person.fictional
        ? "Fictional personal records and course fixtures. No real university offering, employer vacancy or admission eligibility is asserted."
        : "Evidence-backed starting point. Preparation edges are advisory unless a source explicitly identifies a requirement; unknown eligibility is kept separate."),
    catalogueVersion: data.version,
  };
}
export function reversePlan(
  graph: WorldGraph,
  goalIds: string[],
  hypothetical: string[] = [],
) {
  const byId = new Map(graph.nodes.map((n) => [n.id, n])),
    seen = new Set<string>(),
    active = new Set<string>(),
    order: string[] = [],
    cycles: string[][] = [];
  function visit(id: string, path: string[]) {
    if (active.has(id)) {
      cycles.push([...path, id]);
      return;
    }
    if (seen.has(id) || !byId.has(id)) return;
    active.add(id);
    for (const e of graph.edges.filter(
      (e) =>
        e.to === id &&
        [
          "REQUIRES",
          "RECOMMENDED_PREPARATION",
          "CONTRIBUTES_TO",
          "DEVELOPS",
        ].includes(e.relation),
    ))
      visit(e.from, [...path, id]);
    active.delete(id);
    seen.add(id);
    order.push(id);
  }
  goalIds.forEach((id) => visit(id, []));
  const supported = order.filter(
    (id) =>
      ["verified", "reported", "historical"].includes(byId.get(id)!.status) &&
      (!["Capability", "KnowledgeDomain"].includes(byId.get(id)!.kind) ||
        byId
          .get(id)!
          .evidence.some(
            (e) => e.status !== "inferred" && !e.id.startsWith("progress:"),
          )),
  );
  const simulated = order.filter((id) => hypothetical.includes(id));
  const missing = order.filter(
    (id) =>
      !supported.includes(id) &&
      !simulated.includes(id) &&
      !goalIds.includes(id),
  );
  const available = missing.filter((id) =>
    byId
      .get(id)!
      .prerequisites.every(
        (p) => supported.includes(p) || simulated.includes(p),
      ),
  );
  return {
    order,
    supported,
    simulated,
    missing,
    available,
    cycles,
    unknown: goalIds.filter((id) => byId.get(id)?.requirement === "unknown"),
  };
}
export function simulate(
  graph: WorldGraph,
  nodeIds: string[],
  goals: string[],
) {
  const affected = new Set(nodeIds),
    before = reversePlan(graph, goals);
  const potentialEvidence = graph.edges
    .filter((e) => nodeIds.includes(e.from) && e.relation === "DEVELOPS")
    .map((e) => e.to);
  const after = reversePlan(graph, goals, [...nodeIds, ...potentialEvidence]);
  const queue = [...nodeIds];
  while (queue.length) {
    const id = queue.shift()!;
    for (const e of graph.edges.filter(
      (e) =>
        e.from === id &&
        ["DEVELOPS", "CONTRIBUTES_TO", "RECOMMENDED_PREPARATION"].includes(
          e.relation,
        ),
    )) {
      if (!affected.has(e.to)) {
        affected.add(e.to);
        queue.push(e.to);
      }
    }
  }
  return {
    hypothetical: nodeIds,
    potentialEvidence,
    affected: [...affected],
    before,
    after,
    notice:
      "Hypothetical preparation only. No Passport record, verified capability or actual progress is changed.",
  };
}
export function planSemester(
  graph: WorldGraph,
  courses: CourseRecord[],
  state: LivingState,
  goalIds: string[],
  limit = state.academic?.creditLimit || 30,
) {
  const closure = new Set(reversePlan(graph, goalIds).order),
    completed = new Set(
      graph.nodes
        .filter((n) => ["reported", "verified"].includes(n.status))
        .map((n) => n.id),
    );
  const candidates = courses
    .filter((c) => !completed.has(c.id))
    .map((c) => ({
      course: c,
      degreeRequirement:
        state.academic?.requiredCourseIds?.includes(c.id) || false,
      missing: c.prerequisites.filter((p) => !completed.has(p)),
      benefits: new Set(
        graph.edges
          .filter((e) => e.from === c.id && closure.has(e.to))
          .map((e) => e.to),
      ).size,
    }));
  candidates.sort(
    (a, b) =>
      Number(b.degreeRequirement) - Number(a.degreeRequirement) ||
      b.benefits - a.benefits ||
      a.course.id.localeCompare(b.course.id),
  );
  let credits = 0;
  const slots = new Set<string>(),
    selected: CourseRecord[] = [],
    rejected: { id: string; reason: string }[] = [];
  for (const x of candidates) {
    const c = x.course;
    const conflict = c.schedule.some((s) => slots.has(s));
    const wrongTerm =
      c.availability === "published" &&
      !!state.academic?.term.trim() &&
      c.term.toLowerCase() !== state.academic.term.trim().toLowerCase();
    if (
      wrongTerm ||
      x.missing.length ||
      c.credits === null ||
      credits + c.credits > limit ||
      conflict
    ) {
      rejected.push({
        id: c.id,
        reason: wrongTerm
          ? "Published for a different term"
          : x.missing.length
            ? "Prerequisites not yet recorded: " + x.missing.join(", ")
            : c.credits === null
              ? "Credits unknown"
              : conflict
                ? "Published timetable conflict"
                : "Credit limit",
      });
      continue;
    }
    if (!x.benefits && !x.degreeRequirement) continue;
    selected.push(c);
    credits += c.credits;
    c.schedule.forEach((s) => slots.add(s));
  }
  return {
    selected,
    credits,
    limit,
    rejected,
    unverified: [
      "Enrolment eligibility and programme rules require official confirmation.",
      "Credit values are assumed comparable within the supplied catalogue; cross-institution transfer requires confirmation.",
      ...(selected.some((c) => !c.schedule.length)
        ? ["Timetable data is missing; conflicts cannot all be checked."]
        : []),
      ...(selected.some((c) => c.availability !== "published")
        ? ["Current course availability is unverified or fictional."]
        : []),
    ],
    remainingRequirements: state.academic?.remainingRequirements || [],
  };
}
export function visibleWorld(
  graph: WorldGraph,
  state: LivingState,
  mode = state.mode,
) {
  const visible = new Set<string>(["person"]);
  if (mode === "history") {
    graph.nodes
      .filter(
        (n) =>
          n.evidence.some((e) => e.status !== "inferred") ||
          ["historical", "reported", "verified"].includes(n.status),
      )
      .forEach((n) => visible.add(n.id));
  } else if (mode === "goal" && state.goals.length) {
    reversePlan(graph, state.goals).order.forEach((id) => visible.add(id));
    visible.add("programme");
  } else {
    if (graph.nodes.some((n) => n.id === "programme")) visible.add("programme");
    const suggested = graph.nodes
      .filter((n) => n.discoveryRank !== undefined)
      .sort((a, b) => (a.discoveryRank ?? 999) - (b.discoveryRank ?? 999))
      .slice(0, 3);
    (suggested.length
      ? suggested
      : graph.nodes.filter((n) =>
          ["goal:consulting", "goal:risk", "goal:research"].includes(n.id),
        )
    ).forEach((n) => visible.add(n.id));
    state.goals.forEach((id) => visible.add(id));
  }
  if (state.selected) visible.add(state.selected);
  for (const id of state.expanded) {
    if (!graph.nodes.some((n) => n.id === id)) continue;
    visible.add(id);
    for (const e of graph.edges)
      if (e.to === id || e.from === id) {
        visible.add(e.to);
        visible.add(e.from);
      }
  }
  return {
    nodes: graph.nodes.filter(
      (n) =>
        visible.has(n.id) &&
        (mode !== "history" ||
          n.id === "person" ||
          n.id === state.selected ||
          n.evidence.length > 0 ||
          ["historical", "reported", "verified"].includes(n.status)),
    ),
    edges: graph.edges.filter((e) => visible.has(e.from) && visible.has(e.to)),
  };
}
