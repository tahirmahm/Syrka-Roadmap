export type Verification =
  | "institution-verified"
  | "employer-verified"
  | "document-supported"
  | "self-reported"
  | "inferred"
  | "unverified";
export type Evidence = {
  id: string;
  skillId: string;
  title: string;
  verification: Verification;
  sourceSystem: string;
  sourceRecordId: string;
  issuer?: string;
  reference?: string;
  timestamp: string;
  consent: boolean;
};
export type Profile = {
  id: string;
  name: string;
  headline: string;
  fictional: boolean;
  evidence: Evidence[];
  hoursPerWeek: number;
};
export type Skill = {
  id: string;
  name: string;
  description: string;
  prerequisites: string[];
  hours: [number, number];
  resources: { title: string; url: string }[];
  evidence: string;
  source: string;
};
export type Destination = {
  id: string;
  name: string;
  field: string;
  description: string;
  skills: string[];
  qualification?: string;
  source: string;
};
export type NodeStatus =
  | "document-supported"
  | "self-reported"
  | "inferred"
  | "missing"
  | "in-progress"
  | "completed"
  | "requires-verification"
  | "verified"
  | "not-eligible"
  | "recommended";
export type RoadNode = {
  id: string;
  title: string;
  kind:
    | "position"
    | "capability"
    | "action"
    | "milestone"
    | "destination"
    | "alternative"
    | "requirement";
  status: NodeStatus;
  skillId?: string;
  description: string;
  prerequisites: string[];
  hours?: [number, number];
  parent?: string;
  sourceUrl?: string;
  requirementIds?: string[];
};
export type RoadEdge = {
  id: string;
  source: string;
  target: string;
  alternative?: boolean;
};
export type Roadmap = {
  nodes: RoadNode[];
  edges: RoadEdge[];
  destination: Destination;
  sourceRequirements: {
    id: string;
    name: string;
    source: string;
    status: "supported" | "unconfirmed" | "missing";
  }[];
  matches: {
    skill: Skill;
    status: "supported" | "partial" | "missing" | "uncertain";
    strength: number;
    evidence: Evidence[];
  }[];
};
export type SavedState = {
  version: 1;
  profile: Profile;
  destinationId: string;
  completed: string[];
  inProgress: string[];
  expanded: string[];
  updatedAt: string;
};
