import { currentAssertions } from "../living/node-state";
import type {
  Catalogue,
  Occupation,
  Match,
  Person,
  OntologySkill,
} from "./types";
export function normalize(text: string) {
  return text
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}
const expansions: Record<string, string[]> = {
  "ai engineer": [
    "artificial intelligence engineer",
    "artificial intelligence",
    "machine learning",
    "data scientist",
  ],
  "research scientist": ["researcher", "scientist"],
  "policy analyst": ["policy", "political scientist"],
  "quantitative analyst": ["quantitative", "financial analyst", "statistician"],
  entrepreneur: ["entrepreneur", "business manager"],
  diplomat: ["diplomat", "foreign affairs", "ambassador"],
  solicitor: ["solicitor", "lawyer"],
  "biomedical researcher": ["biomedical", "medical researcher", "biologist"],
};
export function searchOccupations(
  data: Catalogue,
  q: string,
  domain = "",
  limit = 40,
): Occupation[] {
  const query = normalize(q),
    terms = expansions[query] || [query];
  const contains = (hay: string, needle: string) =>
    (" " + hay).includes(" " + needle);
  return data.occupations
    .filter((o) => !domain || o.domain === domain)
    .map((o) => {
      const label = normalize(o.label),
        aliases = o.aliases.map(normalize),
        desc = normalize(o.description);
      const expanded = expansions[query]
        ? Math.max(
            0,
            ...terms.map((t, i) =>
              label === t ? 129 - i : contains(label, t) ? 120 - i : 0,
            ),
          )
        : 0;
      const score = !query
        ? 1
        : label === query
          ? 130
          : expanded
            ? expanded
            : aliases.includes(query)
              ? 110
              : contains(label, query)
                ? 100
                : aliases.some((a) => contains(a, query))
                  ? 70
                  : query
                        .split(" ")
                        .every(
                          (t) =>
                            contains(label, t) ||
                            aliases.some((a) => contains(a, t)),
                        )
                    ? 45
                    : (" " + desc + " ").includes(" " + query + " ")
                      ? 15
                      : 0;
      return { o, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.o.label.localeCompare(b.o.label))
    .slice(0, limit)
    .map((x) => x.o);
}
export function relatedOccupations(data: Catalogue, id: string, limit = 8) {
  const o = data.occupations.find((x) => x.id === id);
  if (!o) return [];
  const req = new Set(o.essential);
  return data.occupations
    .filter((x) => x.id !== id)
    .map((x) => ({
      occupation: x,
      shared: x.essential.filter((s) => req.has(s)).length,
      relation: "shared-requirements" as const,
    }))
    .filter((x) => x.shared > 0)
    .sort(
      (a, b) =>
        b.shared /
          (new Set([...o.essential, ...b.occupation.essential]).size || 1) -
          a.shared /
            (new Set([...o.essential, ...a.occupation.essential]).size || 1) ||
        b.shared - a.shared,
    )
    .slice(0, limit);
}
export function matchOccupation(
  person: Person,
  o: Occupation,
  active = currentAssertions(person),
): Match {
  const assertions = active.filter(
    (a) => a.consent && a.selected !== false && o.essential.includes(a.skillId),
  );
  const documented = new Set(
    assertions
      .filter((a) =>
        [
          "document-supported",
          "institution-verified",
          "employer-verified",
        ].includes(a.verification),
      )
      .map((a) => a.skillId),
  );
  const personal = new Set(
    assertions
      .filter((a) => a.verification === "self-reported")
      .map((a) => a.skillId),
  );
  const inferred = new Set(
    assertions
      .filter((a) => a.verification === "inferred")
      .map((a) => a.skillId),
  );
  const shared = [...new Set(assertions.map((a) => a.skillId))];
  const interests = person.interests.filter((i) =>
    normalize(o.label + " " + o.description).includes(normalize(i)),
  );
  const ratio = shared.length / Math.max(o.essential.length, 1);
  const category =
    ratio >= 0.45
      ? "Strong existing alignment"
      : ratio >= 0.15
        ? "Adjacent possibilities"
        : shared.length && interests.length
          ? "Interdisciplinary opportunities"
          : interests.length
            ? "Emerging interests"
            : "Longer-term ambitions";
  return {
    occupation: o,
    alignment: {
      supported: documented.size,
      partial: new Set(
        [...personal, ...inferred].filter((x) => !documented.has(x)),
      ).size,
      total: o.essential.length,
    },
    requirements: {
      status: "not-assessed",
      reason:
        "Occupational skills do not establish mandatory legal, licensing, immigration or employer-specific requirements.",
    },
    effort: {
      missing: o.essential.length - shared.length,
      band:
        ratio >= 0.65 ? "small" : ratio >= 0.25 ? "moderate" : "substantial",
      estimatedHours: null,
    },
    interest: { matched: interests },
    confidence: {
      documented: documented.size,
      selfReported: personal.size,
      inferred: inferred.size,
    },
    category,
    shared,
  };
}
export const discoveryBands = [
  "Realistic opportunities",
  "Adjacent opportunities",
  "Aspirational opportunities",
] as const;
export function discoveryBand(m: Match): (typeof discoveryBands)[number] {
  const coverage = m.shared.length / Math.max(m.alignment.total, 1);
  // Exploration bands describe evidence coverage, never hiring or legal eligibility.
  return m.reportedRoleMatch || (coverage >= 0.45 && m.alignment.supported > 0)
    ? discoveryBands[0]
    : coverage >= 0.15
      ? discoveryBands[1]
      : discoveryBands[2];
}
const specificityCache = new WeakMap<Catalogue, Map<string, number>>();
export function discover(
  data: Catalogue,
  person: Person,
  limit = 60,
  background = person.claims
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
    .map((c) => c.text),
  reportedRoles = person.claims
    .filter((c) => c.approved && c.kind === "employment")
    .map((c) => c.text),
) {
  let frequencies = specificityCache.get(data);
  if (!frequencies) {
    frequencies = new Map();
    for (const o of data.occupations)
      for (const id of new Set(o.essential))
        frequencies.set(id, (frequencies.get(id) || 0) + 1);
    specificityCache.set(data, frequencies);
  }
  const specificity = (id: string) =>
    1 +
    Math.log(1 + data.occupations.length / (1 + (frequencies!.get(id) || 0)));
  const weights = new Map<string, number>(),
    active = currentAssertions(person);
  for (const a of active) {
    if (!a.consent || a.selected === false) continue;
    const weight =
      a.verification === "inferred"
        ? 0.25
        : a.verification === "self-reported"
          ? 0.55
          : 1;
    weights.set(a.skillId, Math.max(weights.get(a.skillId) || 0, weight));
  }
  const context = " " + normalize(background.join(" ")) + " ";
  const contextTokens = new Set(
    context
      .trim()
      .split(" ")
      .filter(
        (t) =>
          t.length > 3 &&
          ![
            "fictional",
            "university",
            "experience",
            "developed",
            "built",
            "using",
            "skills",
            "project",
            "projects",
          ].includes(t),
      ),
  );
  return data.occupations
    .map((o) => {
      const match = matchOccupation(person, o, active);
      const denominator = o.essential.reduce((n, id) => n + specificity(id), 0);
      const overlap = match.shared.reduce(
        (n, id) => n + specificity(id) * (weights.get(id) || 0),
        0,
      );
      // Coverage normalisation prevents occupations with huge lists winning solely by count.
      const score = denominator ? overlap / Math.sqrt(denominator) : 0;
      const interest = Math.min(match.interest.matched.length, 3) * 0.35;
      const titles = [o.label, ...o.aliases].map(normalize);
      match.reportedRoleMatch = reportedRoles.some((role) =>
        titles.some(
          (t) =>
            t.length > 8 &&
            (" " + normalize(role) + " ").includes(" " + t + " "),
        ),
      );
      const titleTokens = new Set(
        titles.flatMap((t) => t.split(" ")).filter((t) => t.length > 3),
      );
      const contextOverlap = [...titleTokens].filter((t) =>
        contextTokens.has(t),
      ).length;
      const exactBackground = titles.some(
        (t) => t.length > 8 && context.includes(" " + t + " "),
      );
      // Reviewed roles/education/projects provide context, not implied qualifications.
      const backgroundScore =
        Math.min(1.2, contextOverlap * 0.3) + (exactBackground ? 1.2 : 0);
      return { match, score: score + interest + backgroundScore };
    })
    .filter(
      (x) => x.match.shared.length > 0 || x.match.interest.matched.length > 0,
    )
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.match.occupation.label.localeCompare(b.match.occupation.label),
    )
    .slice(0, limit)
    .map((x) => x.match);
}

type PhraseEntry = {
  id: string;
  label: string;
  names: { text: string; method: "exact" | "alias" }[];
  tokens: Set<string>;
  labelTokens: Set<string>;
};
const phraseCache = new WeakMap<object, PhraseEntry[]>();
const stop = new Set([
  "use",
  "manage",
  "perform",
  "apply",
  "with",
  "and",
  "of",
  "the",
  "for",
  "in",
  "on",
  "to",
  "or",
  "an",
  "as",
  "a",
]);
const token = (s: string) =>
  s
    .replace(/(ing|ed|es|s)$/, "")
    .replace(/^analys.*/, "analys")
    .replace(/^statistic.*/, "statistic")
    .replace(/^econometric.*/, "econometric")
    .replace(/^economic.*/, "econom")
    .replace(/^program.*/, "program");
const relatedTerms: Record<string, string[]> = {
  regression: ["statistic", "econometric"],
  quantitative: ["statistic", "analys"],
  coding: ["program"],
  datasets: ["data"],
  interviewing: ["interview", "research"],
  evaluation: ["evaluat", "assess"],
  research: ["research", "literature"],
};
export function mapText(
  text: string,
  skills: Pick<OntologySkill, "id" | "label" | "aliases">[],
  max = 12,
) {
  let index = phraseCache.get(skills);
  if (!index) {
    index = skills.map((s) => {
      const names = [
        { text: normalize(s.label), method: "exact" as const },
        ...s.aliases.map((a) => ({
          text: normalize(a),
          method: "alias" as const,
        })),
      ].filter((n) => n.text.length >= 3);
      return {
        id: s.id,
        label: s.label,
        names,
        labelTokens: new Set(
          normalize(s.label)
            .split(" ")
            .filter(
              (x) =>
                !stop.has(x) &&
                !["techniques", "methods", "skills"].includes(x),
            )
            .map(token),
        ),
        tokens: new Set(
          names.flatMap((n) =>
            n.text
              .split(" ")
              .filter((x) => !stop.has(x))
              .map(token),
          ),
        ),
      };
    });
    phraseCache.set(skills, index);
  }
  const norm = " " + normalize(text) + " ";
  const exact = index
    .map((s) => {
      const hit = s.names.find((n) => norm.includes(" " + n.text + " "));
      return hit
        ? {
            skillId: s.id,
            label: s.label,
            method: hit.method,
            confidence:
              hit.method === "exact" ? ("high" as const) : ("medium" as const),
            confirmed: false,
          }
        : null;
    })
    .filter((x): x is NonNullable<typeof x> => !!x)
    .sort((a, b) => b.label.length - a.label.length);
  const query = new Set(
    normalize(text)
      .split(" ")
      .filter((x) => !stop.has(x))
      .flatMap((x) => [token(x), ...(relatedTerms[x] || [])]),
  );
  const exactIds = new Set(exact.map((m) => m.skillId));
  const candidates = index
    .filter((s) => !exactIds.has(s.id))
    .map((s) => ({
      s,
      overlap: [...query].filter((t) => s.tokens.has(t)).length,
      labelCoverage:
        [...s.labelTokens].filter((t) => query.has(t)).length /
        Math.max(s.labelTokens.size, 1),
    }))
    // Alias unions must not introduce an absent specialist qualifier (e.g. genetics).
    .filter((x) => x.overlap >= 2 && x.labelCoverage === 1)
    .sort(
      (a, b) =>
        b.overlap / (b.s.tokens.size + query.size - b.overlap) -
        a.overlap / (a.s.tokens.size + query.size - a.overlap),
    )
    .slice(0, 3)
    .map(({ s }) => ({
      skillId: s.id,
      label: s.label,
      method: "lexical-candidate" as const,
      confidence: "low" as const,
      confirmed: false,
    }));
  return [...exact, ...candidates].slice(0, max);
}
