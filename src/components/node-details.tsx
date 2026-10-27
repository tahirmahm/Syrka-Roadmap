"use client";
import {
  X,
  ArrowUpRight,
  Check,
  Play,
  RotateCcw,
  Clock3,
  ShieldCheck,
} from "lucide-react";
import esco from "@/data/esco.json";
import { skillById } from "@/data/ontology";
import { statusLabels } from "./roadmap-canvas";
import type { Profile, RoadNode } from "@/lib/types";
export function NodeDetails({
  node,
  profile,
  onClose,
  onStatus,
}: {
  node: RoadNode;
  profile: Profile;
  onClose: () => void;
  onStatus: (id: string, status: "completed" | "in-progress" | "reset") => void;
}) {
  const skill = node.skillId ? skillById[node.skillId] : null;
  const evidence = profile.evidence.filter(
    (e) => e.skillId === node.skillId && e.consent,
  );
  return (
    <aside className="detail-panel" aria-label={`Details for ${node.title}`}>
      <div className="detail-top">
        <span className="eyebrow">STOP DETAILS</span>
        <button
          className="icon-button"
          onClick={onClose}
          aria-label="Close details"
        >
          <X size={18} />
        </button>
      </div>
      <span className={`status-chip ${node.status}`}>
        {statusLabels[node.status]}
      </span>
      <h2>{node.title}</h2>
      <p>{node.description}</p>
      <section>
        <h3>Why this matters</h3>
        <p>
          {skill
            ? "This capability supports your selected destination. Complete prerequisite learning first and use the evidence criteria to guide your practice."
            : "This stop connects the evidence you have with the direction you want to take."}
        </p>
      </section>
      <section>
        <h3>Prerequisites</h3>
        {node.prerequisites.length ? (
          <ul>
            {node.prerequisites.map((id) => (
              <li key={id}>
                {skillById[id]?.name ||
                  (id === "portfolio" ? "Bring your evidence together" : id)}
              </li>
            ))}
          </ul>
        ) : (
          <p>No prerequisites in this learning catalogue.</p>
        )}
      </section>
      <section>
        <h3>
          <ShieldCheck size={15} /> Current evidence
        </h3>
        {evidence.length ? (
          evidence.map((e) => (
            <div className="evidence-row" key={e.id}>
              <strong>{e.title}</strong>
              <small>
                {e.verification} · {e.sourceSystem}
              </small>
              <small>
                Record {e.sourceRecordId} ·{" "}
                {new Date(e.timestamp).toLocaleDateString("en-GB")}
              </small>
              {e.issuer && <small>Issuer: {e.issuer}</small>}
            </div>
          ))
        ) : (
          <p>
            No supporting record yet. Completion here is self-reported and does
            not issue a credential.
          </p>
        )}
      </section>
      {skill && (
        <>
          <section>
            <h3>Evidence to work toward</h3>
            <p>{skill.evidence}</p>
          </section>
          <section>
            <h3>
              <Clock3 size={15} /> Time & effort
            </h3>
            <p>
              {skill.hours.join("–")} hours, roughly{" "}
              {Math.ceil(skill.hours[0] / profile.hoursPerWeek)}–
              {Math.ceil(skill.hours[1] / profile.hoursPerWeek)} weeks at{" "}
              {profile.hoursPerWeek} hours/week. Planning estimates, not
              measured outcomes.
            </p>
          </section>
          <section>
            <h3>Learning resources</h3>
            {skill.resources.map((r) => (
              <a
                className="resource-link"
                key={r.url}
                href={r.url}
                target="_blank"
                rel="noreferrer"
              >
                {r.title}
                <ArrowUpRight size={16} />
              </a>
            ))}
          </section>
          <section>
            <h3>Source & limitations</h3>
            <p>
              Locally authored learning relationship; no formal qualification
              equivalence is asserted.
            </p>
            <a href={skill.source} target="_blank" rel="noreferrer">
              View learning source <ArrowUpRight size={12} />
            </a>
          </section>
        </>
      )}
      {node.sourceUrl && (
        <section>
          <h3>Authoritative source</h3>
          <p>
            European Commission ESCO · retrieved{" "}
            {new Date(esco.retrievedAt).toLocaleDateString("en-GB")}.{" "}
            {node.requirementIds?.length} essential skills in this occupational
            reference. These are not a legal eligibility assessment.
          </p>
          <a href={node.sourceUrl} target="_blank" rel="noreferrer">
            Inspect original source
            <ArrowUpRight size={13} />
          </a>
          {node.requirementIds && (
            <ul>
              {node.requirementIds.map((id) => (
                <li key={id}>{esco.skills.find((s) => s.uri === id)?.label}</li>
              ))}
            </ul>
          )}
        </section>
      )}
      {["capability", "milestone"].includes(node.kind) && (
        <div className="detail-actions">
          <button
            className="primary"
            onClick={() => onStatus(node.id, "completed")}
          >
            <Check size={16} /> Mark completed
          </button>
          <button
            className="secondary"
            onClick={() => onStatus(node.id, "in-progress")}
          >
            <Play size={15} /> Start working
          </button>
          <button
            className="text-button"
            onClick={() => onStatus(node.id, "reset")}
          >
            <RotateCcw size={14} /> Reset progress
          </button>
          <small>
            Progress is your own record. It does not verify mastery.
          </small>
        </div>
      )}
    </aside>
  );
}
