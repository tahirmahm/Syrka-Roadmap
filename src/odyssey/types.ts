export type Source = {
  system: string;
  recordId: string;
  url?: string;
  version: string;
  retrievedAt?: string;
};
export type Occupation = {
  id: string;
  label: string;
  aliases: string[];
  description: string;
  code: string;
  domain: string;
  essential: string[];
  optional: string[];
  broader: string[];
  labels: Record<string, string>;
  source: Source;
};
export type OntologySkill = {
  id: string;
  label: string;
  aliases: string[];
  description: string;
  type: string;
  broader: string[];
  source: Source;
};
export type Catalogue = {
  version: string;
  retrievedAt: string;
  source: string;
  coverage: string;
  occupations: Occupation[];
  skills: OntologySkill[];
};
export type ClaimKind =
  | "education"
  | "qualification"
  | "course"
  | "employment"
  | "internship"
  | "volunteering"
  | "project"
  | "publication"
  | "language"
  | "skill"
  | "award"
  | "interest"
  | "learning-outcome"
  | "assessment"
  | "other";
export type Mapping = {
  skillId: string;
  label: string;
  method:
    "exact" | "alias" | "lexical-candidate" | "user-confirmed" | "ai-candidate";
  confidence: "high" | "medium" | "low";
  confirmed: boolean;
  selected?: boolean;
};
export type Claim = {
  id: string;
  kind: ClaimKind;
  text: string;
  quote: string;
  page: number;
  section: string;
  mappings: Mapping[];
  approved: boolean;
  institution?: string;
  dates?: string;
  grade?: string;
};
export type Assertion = {
  id: string;
  skillId: string;
  label: string;
  claimId: string;
  sourceSystem: string;
  sourceRecordId: string;
  quote: string;
  page?: number;
  verification:
    | "self-reported"
    | "document-supported"
    | "inferred"
    | "institution-verified"
    | "employer-verified";
  consent: boolean;
  selected?: boolean;
};
export type Course = {
  id: string;
  institution: string;
  programme: string;
  code: string;
  title: string;
  status: "reported-complete" | "in-progress" | "unknown";
  sourceSystem: string;
  sourceRecordId: string;
  verification: "document-supported" | "self-reported";
  campusUrl?: string;
  outcomes: { id: string; text: string; quote: string; skillIds: string[] }[];
  assessments: { title: string; evidence: string; skillIds: string[] }[];
};
export type Person = {
  id: string;
  name: string;
  headline: string;
  fictional: boolean;
  hoursPerWeek: number;
  interests: string[];
  locations: string[];
  languages: string[];
  budget: "free-resources" | "unspecified";
  claims: Claim[];
  assertions: Assertion[];
  courses: Course[];
  imports?: {
    id: string;
    name: string;
    importedAt: string;
    methods: string[];
    claimCount: number;
  }[];
};
export type PathRecord = {
  id: string;
  occupationId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  completed: string[];
  working: string[];
  expanded: string[];
  routeChoices: Record<string, string>;
  completedResources?: string[];
  evidenceNotes?: {
    id: string;
    topicId: string;
    note: string;
    createdAt: string;
  }[];
};
export type Workspace = {
  version: 2;
  person: Person;
  paths: PathRecord[];
  activePathId: string | null;
  savedOccupations: string[];
  compare: string[];
  audit: { event: string; at: string; recordId?: string }[];
};
export type Resource = {
  title: string;
  url: string;
  kind: "free-material" | "course" | "project" | "official-reference";
  note: string;
};
export type Topic = {
  id: string;
  label: string;
  summary: string;
  family: string;
  stage: number;
  prerequisites: string[];
  source: string;
  provenance: "resource-derived" | "source-requirement" | "editorial-grouping";
  resources: Resource[];
  effort: "introductory" | "intermediate" | "advanced" | "not-estimated";
  practice?: {
    question: string;
    options: string[];
    answer: number;
    explanation: string;
  }[];
  skillIds: string[];
  optional?: boolean;
};
export type Curriculum = {
  id: string;
  title: string;
  occupationTerms: string[];
  families: { id: string; label: string; summary: string }[];
  topics: Topic[];
};
export type RoadmapGraph = {
  occupation: Occupation;
  curriculum: Curriculum | null;
  topics: Topic[];
  families: { id: string; label: string; summary: string }[];
  requiredSkillIds: string[];
  onward: {
    occupation: Occupation;
    shared: number;
    relation: "shared-requirements";
  }[];
  cycles: string[][];
};
export type Match = {
  reportedRoleMatch?: boolean;
  occupation: Occupation;
  alignment: { supported: number; partial: number; total: number };
  requirements: { status: "not-assessed"; reason: string };
  effort: {
    missing: number;
    band: "small" | "moderate" | "substantial";
    estimatedHours: null;
  };
  interest: { matched: string[] };
  confidence: { documented: number; selfReported: number; inferred: number };
  category:
    | "Strong existing alignment"
    | "Adjacent possibilities"
    | "Interdisciplinary opportunities"
    | "Emerging interests"
    | "Longer-term ambitions";
  shared: string[];
  explanation?: { shared: string[]; missing: string[] };
};
export type ExtractedDocument = {
  id: string;
  name: string;
  mime: string;
  pages: { number: number; text: string; method: "text" | "ocr" }[];
  status: "review-required";
  createdAt: string;
};
