import { test } from "node:test";
import assert from "node:assert/strict";
import type { Person, Claim, Assertion, Catalogue } from "../src/odyssey/types";
import type { WorldNode } from "../src/living/schema";
import {
  deriveNodeDimensions,
  evaluatePrerequisiteGroups,
  prerequisiteGroupSchema,
  reconcileEvidence,
  reconcileAdvisoryLinks,
  currentAssertions,
  type StatefulNode,
} from "../src/living/node-state";
import {
  capabilityBrain,
  discoveryProjection,
} from "../src/odyssey/capability-model";
import { discover, matchOccupation } from "../src/odyssey/catalogue";
const node = (id: string, patch: Partial<WorldNode> = {}): StatefulNode => ({
  id,
  label: id,
  kind: "Capability",
  summary: "A bounded fictional test concept",
  domain: "Fictional",
  skillIds: [],
  source: {
    kind: "editorial",
    reference: "Fictional source",
    version: "1",
    checkedAt: null,
    quality: "advisory",
  },
  requirement: "advisory",
  status: "available",
  evidence: [],
  actions: [],
  prerequisites: [],
  ...patch,
});
const doc = {
  id: "claim:one",
  text: "A reviewed artifact",
  quote: "Described work in the source",
  status: "document-supported",
};
const group = (
  operator: "AND" | "OR",
  ids: string[],
  requirement: "formal" | "advisory" = "formal",
) =>
  prerequisiteGroupSchema.parse({
    id: "rule",
    operator,
    nodeIds: ids,
    requirement,
    sourceReference:
      "Fictional supplied programme rule, not a live admission rule",
  });
function person(): Person {
  return {
    id: "person",
    name: "Fictional",
    headline: "",
    fictional: true,
    hoursPerWeek: 3,
    interests: [],
    locations: [],
    languages: [],
    budget: "free-resources",
    claims: [],
    assertions: [],
    courses: [],
  };
}
const claim: Claim = {
  id: "claim",
  kind: "project",
  text: "Analysed source data",
  quote: "Analysed source data",
  page: 1,
  section: "Project",
  mappings: [
    {
      skillId: "skill",
      label: "Analysis",
      method: "exact",
      confidence: "high",
      confirmed: false,
      selected: true,
    },
  ],
  approved: true,
};
const assertion: Assertion = {
  id: "assertion",
  skillId: "skill",
  label: "Analysis",
  claimId: "claim",
  sourceSystem: "user-document",
  sourceRecordId: "document",
  quote: claim.quote,
  verification: "document-supported",
  consent: true,
  selected: true,
};

test("submitted and completed progress do not manufacture evidence, mastery or an awarded qualification", () => {
  const n = node("reading", {
    evidence: [
      {
        id: "progress:reading",
        text: "Checked off",
        quote: "",
        status: "self-reported",
      },
    ],
  });
  const before = structuredClone(n),
    submitted = deriveNodeDimensions(n, { progress: "submitted" }),
    completed = deriveNodeDimensions(n, { progress: "completed" });
  assert.equal(submitted.progress, "submitted");
  assert.equal(completed.progress, "completed");
  assert.equal(completed.evidence, "none");
  assert.equal(completed.eligibility, "unknown");
  assert.deepEqual(n, before);
  const old = node("attendance", {
    kind: "AcademicProgramme",
    status: "historical",
    evidence: [
      { ...doc, text: "Incomplete study; attended Example University" },
    ],
  });
  const state = deriveNodeDimensions(old);
  assert.equal(state.history, true);
  assert.equal(state.progress, "none");
  assert.equal(state.evidence, "document-supported");
  assert.equal(state.eligibility, "unknown");
});

test("reported completion, issuer verification and hypothetical reality remain orthogonal", () => {
  const course = node("course", {
      kind: "UniversityCourse",
      status: "reported",
      evidence: [doc],
    }),
    real = deriveNodeDimensions(course),
    simulated = deriveNodeDimensions(course, { hypothetical: true });
  assert.equal(real.progress, "completed");
  assert.equal(real.evidence, "document-supported");
  assert.equal(real.reality, "actual");
  assert.equal(simulated.reality, "hypothetical");
  assert.equal(simulated.evidence, "document-supported");
  assert.equal(simulated.eligibility, "unknown");
  const verified = node("credential", {
    evidence: [{ ...doc, status: "institution-verified" }],
  });
  assert.equal(deriveNodeDimensions(verified).evidence, "issuer-verified");
  assert.equal(deriveNodeDimensions(verified).progress, "none");
  assert.equal(
    deriveNodeDimensions(verified, { disputed: true }).evidence,
    "disputed",
  );
});

test("sourced AND and OR prerequisites permit real alternatives without treating helpful preparation as mandatory", () => {
  const a = node("a", { evidence: [doc] }),
    b = node("b");
  const and = evaluatePrerequisiteGroups([group("AND", ["a", "b"])], [a, b]);
  assert.equal(and.state, "missing");
  assert.deepEqual(and.blockedBy, ["b"]);
  const or = evaluatePrerequisiteGroups([group("OR", ["a", "b"])], [a, b]);
  assert.equal(or.state, "satisfied");
  assert.deepEqual(or.blockedBy, []);
  const optional = evaluatePrerequisiteGroups(
    [group("AND", ["b"], "advisory")],
    [a, b],
  );
  assert.equal(optional.state, "satisfied");
  assert.equal(optional.groups[0].state, "missing");
  assert.equal(
    deriveNodeDimensions(b, { prerequisites: optional }).feasibility,
    "actionable",
  );
  assert.throws(() =>
    prerequisiteGroupSchema.parse({
      ...group("AND", ["a"]),
      sourceReference: "",
    }),
  );
});

test("unknown references, inferred evidence, self-reports and unresolved cycles cannot silently satisfy formal prerequisites", () => {
  const inferred = node("inferred", {
      status: "inferred",
      evidence: [{ ...doc, status: "inferred" }],
    }),
    reported = node("reported", {
      evidence: [{ ...doc, status: "self-reported" }],
    }),
    checked = node("checked", {
      status: "reported",
      evidence: [{ ...doc, id: "progress:checked", status: "self-reported" }],
    });
  assert.equal(
    evaluatePrerequisiteGroups(
      [group("OR", ["absent", "inferred", "reported"])],
      [inferred, reported],
    ).state,
    "unknown",
  );
  assert.equal(
    evaluatePrerequisiteGroups([group("AND", ["checked"])], [checked]).state,
    "missing",
  );
  const a = node("a", { evidence: [doc], prerequisites: ["b"] }),
    b = node("b", { evidence: [doc], prerequisites: ["a"] });
  const cyclic = evaluatePrerequisiteGroups([group("AND", ["a"])], [a, b]);
  assert.equal(cyclic.state, "unknown");
  assert.ok(cyclic.cycles.some((c) => c[0] === c.at(-1)));
  assert.equal(
    deriveNodeDimensions(a, { prerequisites: cyclic }).feasibility,
    "unknown",
  );
});

test("claim correction invalidates stale associations without removing original experience or portable assertions", () => {
  const before = {
    ...person(),
    claims: [structuredClone(claim)],
    assertions: [
      structuredClone(assertion),
      {
        ...assertion,
        id: "portable",
        claimId: "external-passport-record",
        sourceSystem: "passport",
      },
    ],
  };
  const corrected = structuredClone(before);
  corrected.claims[0].text = "Corrected description of incomplete study";
  corrected.claims[0].educationState = "incomplete";
  const result = reconcileEvidence(corrected, before);
  assert.deepEqual(result.affectedSkillIds, ["skill"]);
  assert.equal(result.invalidated[0].assertionId, "assertion");
  assert.equal(result.person.assertions[0].selected, false);
  assert.equal(result.person.claims[0].quote, claim.quote);
  assert.equal(result.person.assertions.length, 2);
  assert.equal(result.person.assertions[1].selected, true);
  assert.equal(before.assertions[0].selected, true);
  assert.equal(capabilityBrain(result.person).capabilities.length, 1);
});

test("revoked consent and unapproved source claims disappear from projections, never from preserved history", () => {
  const p = {
    ...person(),
    claims: [{ ...claim, approved: false }],
    assertions: [
      assertion,
      { ...assertion, id: "revoked", claimId: "external", consent: false },
      {
        ...assertion,
        id: "portable",
        claimId: "standalone",
        sourceSystem: "passport",
      },
    ],
  };
  assert.deepEqual(
    currentAssertions(p).map((a) => a.id),
    ["portable"],
  );
  assert.equal(capabilityBrain(p).experiences.length, 0);
  assert.equal(discoveryProjection(p).assertions.length, 1);
  assert.equal(p.claims.length, 1);
  assert.equal(p.assertions.length, 3);
  const reconciled = reconcileEvidence(p);
  assert.equal(reconciled.person.assertions[0].selected, false);
  assert.equal(reconciled.person.assertions[1].selected, false);
});

test("cleared document mappings no longer feed occupation matching or recommendations", () => {
  const p = {
    ...person(),
    claims: [{ ...claim, mappings: [] }],
    assertions: [assertion],
  };
  const o = {
    id: "occupation",
    label: "Fictional Analyst",
    aliases: [],
    description: "",
    code: "",
    domain: "Research",
    essential: ["skill"],
    optional: [],
    broader: [],
    labels: {},
    source: { system: "fixture", recordId: "occupation", version: "1" },
  };
  const data: Catalogue = {
    version: "fixture",
    retrievedAt: "2026-11-01T00:00:00Z",
    source: "fixture",
    coverage: "fictional",
    occupations: [o],
    skills: [],
  };
  assert.deepEqual(matchOccupation(p, o).shared, []);
  assert.deepEqual(discover(data, p), []);
  const active = { ...p, claims: [claim] };
  assert.ok(matchOccupation(active, o).shared.includes("skill"));
  assert.equal(discover(data, active)[0].occupation.id, "occupation");
});

test("removing a previously local claim cannot turn its stale assertion into a trusted portable orphan", () => {
  const before = {
    ...person(),
    claims: [claim],
    assertions: [
      assertion,
      {
        ...assertion,
        id: "portable",
        claimId: "standalone",
        sourceSystem: "passport",
      },
    ],
  };
  const after = { ...before, claims: [] };
  const checked = reconcileEvidence(after, before);
  assert.equal(checked.person.assertions[0].selected, false);
  assert.equal(checked.person.assertions[1].selected, true);
  assert.match(checked.invalidated[0].reason, /removed/);
  assert.equal(before.claims.length, 1);
  assert.equal(checked.person.assertions.length, 2);
});

test("claim corrections suspend advisory associations without deleting accepted history or silently reactivating pending links", () => {
  const before = { ...person(), claims: [claim] };
  const link = {
    from: "evidence:claim",
    to: "goal:research",
    relation: "CONTRIBUTES_TO" as const,
    rationale: "The described analysis may support research preparation.",
    claimId: claim.id,
    quote: claim.quote,
    acceptedAt: "2026-11-01T12:00:00Z",
  };
  const original = structuredClone(link);
  const changed = {
    ...before,
    claims: [
      {
        ...claim,
        educationState: "incomplete" as const,
        grade: "Corrected reported grade",
      },
    ],
  };
  const suspended = reconcileAdvisoryLinks([link], changed, before)!;
  assert.equal(suspended[0].reviewStatus, "needs-review");
  assert.equal(suspended[0].acceptedAt, link.acceptedAt);
  assert.equal(suspended[0].rationale, link.rationale);
  assert.deepEqual(link, original);
  assert.equal(
    reconcileAdvisoryLinks([link], { ...before, claims: [] }, before)![0]
      .reviewStatus,
    "needs-review",
  );
  assert.equal(
    reconcileAdvisoryLinks(
      [link],
      { ...before, claims: [{ ...claim, approved: false }] },
      before,
    )![0].reviewStatus,
    "needs-review",
  );
  assert.equal(
    reconcileAdvisoryLinks(suspended, before, before)![0].reviewStatus,
    "needs-review",
  );
  assert.deepEqual(reconcileAdvisoryLinks([link], before, before), [link]);
  assert.equal(reconcileAdvisoryLinks(undefined, before, before), undefined);
});
