"use client";
import { useMobile } from "../hooks";
import { useEffect, useRef, useState } from "react";
import {
  X,
  ExternalLink,
  Check,
  Play,
  RotateCcw,
  BookOpen,
  ShieldCheck,
} from "lucide-react";
import type { Topic, Person, PathRecord, Occupation } from "../types";
import {
  deterministicLesson,
  type Lesson,
  type LearningAction,
} from "../learning";
import { jsonRequest } from "../client";
const tabs = [
  "Overview",
  "Learn",
  "My Coursework",
  "My Evidence",
  "Practice",
  "Next Steps",
] as const;
export function TopicPanel({
  topic,
  topics,
  person,
  path,
  occupation,
  onClose,
  onTopic,
  onProgress,
  onRoute,
  onDiscover,
  plan,
}: {
  topic: Topic;
  topics: Topic[];
  person: Person;
  path: PathRecord;
  occupation: Occupation;
  onClose: () => void;
  onTopic: (id: string) => void;
  onProgress: (id: string, status: "completed" | "working" | "reset") => void;
  onRoute: (topic: string, route: string) => void;
  onDiscover: (query: string) => void;
  plan: {
    topicIds: string[];
    selectedRoutes: { topicId: string; route: string; reason: string }[];
  } | null;
}) {
  const mobile = useMobile();
  const [tab, setTab] = useState<(typeof tabs)[number]>("Overview"),
    [lesson, setLesson] = useState<Lesson | null>(null),
    [consent, setConsent] = useState(false),
    [busy, setBusy] = useState(false),
    [answers, setAnswers] = useState<Record<number, number>>({});
  const panel = useRef<HTMLElement>(null);
  const assertions = person.assertions.filter(
    (a) =>
      a.consent && a.selected !== false && topic.skillIds.includes(a.skillId),
  );
  const courses = person.courses.filter(
    (c) =>
      c.outcomes.some((o) =>
        o.skillIds.some((id) => topic.skillIds.includes(id)),
      ) ||
      c.assessments.some((a) =>
        a.skillIds.some((id) => topic.skillIds.includes(id)),
      ),
  );
  useEffect(() => {
    panel.current?.focus();
  }, [topic.id]);
  const act = async (action: LearningAction) => {
    const fallback = deterministicLesson(topic, action, assertions.length);
    if (action === "possibilities") setTab("Next Steps");
    setLesson(fallback);
    setAnswers({});
    if (!consent) return;
    setBusy(true);
    try {
      setLesson(
        await jsonRequest<Lesson>("/api/learning", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            occupationId: occupation.id,
            topicId: topic.id,
            action,
            consent: true,
            evidenceCount: assertions.length,
          }),
        }),
      );
    } catch (e) {
      setLesson({
        ...fallback,
        notice: `${(e as Error).message} The deterministic guide remains available.`,
      });
    } finally {
      setBusy(false);
    }
  };
  const status = path.completed.includes(topic.id)
    ? "Completed · self-reported"
    : path.working.includes(topic.id)
      ? "In progress"
      : assertions.length
        ? "Supporting claims linked"
        : "Evidence needed";
  return (
    <aside
      className="topic-panel"
      ref={panel}
      tabIndex={-1}
      aria-label={`Topic details: ${topic.label}`}
      role={mobile ? "dialog" : undefined}
      aria-modal={mobile ? true : undefined}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
        if (e.key === "Tab" && window.innerWidth < 768) {
          const items = Array.from(
            e.currentTarget.querySelectorAll<HTMLElement>(
              "button,input,a[href]",
            ),
          ).filter((x) => !x.hasAttribute("disabled"));
          if (
            e.shiftKey &&
            (document.activeElement === items[0] ||
              document.activeElement === panel.current)
          ) {
            e.preventDefault();
            items.at(-1)?.focus();
          } else if (!e.shiftKey && document.activeElement === items.at(-1)) {
            e.preventDefault();
            items[0]?.focus();
          }
        }
      }}
    >
      <div className="topic-panel-heading">
        <span className="eyebrow">A TOPIC TO EXPLORE</span>
        <button
          className="icon-button"
          aria-label="Close topic details"
          onClick={onClose}
        >
          <X size={18} />
        </button>
      </div>
      <span className="status-chip">{status}</span>
      <h2>{topic.label}</h2>
      <div className="topic-tabs" role="tablist" aria-label="Topic sections">
        {tabs.map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
          >
            {t}
            {t === "My Coursework" && courses.length
              ? ` (${courses.length})`
              : ""}
          </button>
        ))}
      </div>
      <div className="topic-body">
        {tab === "Overview" && (
          <>
            <p>{topic.summary}</p>
            <section>
              <h3>How this relates to your destination</h3>
              <p>
                {topic.provenance === "source-requirement"
                  ? `ESCO links this capability to ${occupation.label}. This occupational reference does not establish licensing, hiring or admissions requirements.`
                  : "This is a curated learning topic for a related occupational pathway. The suggested learning order is distinct from formal entry requirements."}
              </p>
            </section>
            <section>
              <h3>Connected prerequisites</h3>
              {topic.prerequisites.length ? (
                <div className="linked-topics">
                  {topic.prerequisites.map((id) => (
                    <button key={id} onClick={() => onTopic(id)}>
                      {topics.find((t) => t.id === id)?.label || id}
                    </button>
                  ))}
                </div>
              ) : (
                <p>
                  No educational prerequisite order is asserted in the source.
                  Explore independently.
                </p>
              )}
            </section>
            <section>
              <h3>Source & provenance</h3>
              <p>
                {topic.provenance === "source-requirement"
                  ? "Official ESCO occupation–skill relation."
                  : "Resource-derived editorial learning sequence; not an institutionally verified curriculum or formal qualification equivalence."}
              </p>
              <a href={topic.source} target="_blank" rel="noreferrer">
                Inspect source
                <ExternalLink size={13} />
              </a>
            </section>
            <section>
              <h3>Time, costs & uncertainty</h3>
              <p>
                {topic.effort === "not-estimated"
                  ? "No grounded time estimate is available."
                  : `Learning level: ${topic.effort}. Time to mastery is not inferred.`}{" "}
                Your planned pace is {person.hoursPerWeek} hours/week. Course
                fees, admission and accreditation must be checked at the source.
              </p>
            </section>
          </>
        )}
        {tab === "Learn" && (
          <>
            <p>
              Use the original source, then test your understanding with an
              artifact or example.
            </p>
            {topic.resources.map((r) => (
              <article className="learning-resource" key={r.url}>
                <span className="subtle-tag">
                  {r.kind.replaceAll("-", " ")}
                </span>
                <a href={r.url} target="_blank" rel="noreferrer">
                  {r.title}
                  <ExternalLink size={14} />
                </a>
                <p>{r.note}</p>
              </article>
            ))}
            <h3>Choose your learning route</h3>
            <div className="route-options">
              {[
                [
                  "guided",
                  "Guided resources",
                  "Read, practice and request feedback.",
                ],
                [
                  "project",
                  "Project-based practice",
                  "Build an artifact and document the decisions.",
                ],
              ].map(([id, title, text]) => (
                <button
                  key={id}
                  aria-pressed={
                    (path.routeChoices[topic.id] || "guided") === id
                  }
                  onClick={() => onRoute(topic.id, id)}
                >
                  <BookOpen size={17} />
                  <strong>{title}</strong>
                  <span>{text}</span>
                </button>
              ))}
            </div>
            <p className="small">
              These routes support learning; they do not automatically satisfy a
              formal credential requirement.
            </p>
          </>
        )}
        {tab === "My Coursework" && (
          <>
            {courses.length ? (
              courses.map((c) => (
                <article className="course-link" key={c.id}>
                  <span className="eyebrow">{c.institution}</span>
                  <h3>
                    {c.code} · {c.title}
                  </h3>
                  <p>{c.programme}</p>
                  <span className="status-chip">
                    {c.status} · {c.verification}
                  </span>
                  <h4>Documented learning outcomes</h4>
                  {c.outcomes
                    .filter((o) =>
                      o.skillIds.some((id) => topic.skillIds.includes(id)),
                    )
                    .map((o) => (
                      <blockquote key={o.id}>
                        {o.text}
                        <small>
                          Source: {c.sourceSystem} / {c.sourceRecordId} ·{" "}
                          {o.quote}
                        </small>
                      </blockquote>
                    ))}
                  <h4>Relevant assessments</h4>
                  {c.assessments
                    .filter((a) =>
                      a.skillIds.some((id) => topic.skillIds.includes(id)),
                    )
                    .map((a) => (
                      <p key={a.title}>
                        {a.title}
                        <small>{a.evidence}</small>
                      </p>
                    ))}
                  {c.campusUrl && (
                    <a href={c.campusUrl} target="_blank" rel="noreferrer">
                      Open authorized Campus course
                      <ExternalLink size={13} />
                    </a>
                  )}
                  <p className="small">
                    Course completion and learning outcomes support specific
                    claims; they do not automatically prove mastery of every
                    associated skill.
                  </p>
                </article>
              ))
            ) : (
              <div className="panel-empty">
                <BookOpen />
                <h3>No linked coursework yet</h3>
                <p>
                  Import an authorized syllabus or assessment and explicitly
                  confirm its outcome-to-skill mapping. We do not invent course
                  links or share Campus credentials.
                </p>
              </div>
            )}
          </>
        )}
        {tab === "My Evidence" && (
          <>
            {assertions.length ? (
              assertions.map((a) => (
                <article className="evidence-row" key={a.id}>
                  <span className="status-chip">{a.verification}</span>
                  <h3>{a.label}</h3>
                  <blockquote>{a.quote}</blockquote>
                  <small>
                    {a.sourceSystem} / {a.sourceRecordId}
                    {a.page ? ` · page ${a.page}` : ""}
                  </small>
                </article>
              ))
            ) : (
              <div className="panel-empty">
                <ShieldCheck />
                <h3>Evidence is still needed</h3>
                <p>
                  Attach relevant work, a reviewed assessment or a specific
                  documented learning outcome. Marking the topic done only
                  changes your progress record.
                </p>
              </div>
            )}
          </>
        )}
        {tab === "Practice" && (
          <>
            <p>
              Practice questions are learning aids, not formal assessments or
              verified credentials.
            </p>
            <button className="primary" onClick={() => void act("quiz")}>
              Start practice questions
            </button>
            <section>
              <h3>Practical exercise</h3>
              <p>
                Use a small, fictional or authorized example to demonstrate{" "}
                {topic.label.toLowerCase()}. Explain the approach, assumptions
                and limitations. Compare the artifact with the linked reference
                and request independent feedback.
              </p>
            </section>
          </>
        )}
        {tab === "Next Steps" && (
          <>
            <h3>Move forward with evidence</h3>
            <p>
              Selected route:{" "}
              {(path.routeChoices[topic.id] || "guided") === "project"
                ? "Practice project — create a demonstrable artifact and request review."
                : "Guided resources — work through the source and apply it to a small example."}
            </p>
            <ol>
              <li>Inspect prerequisites and choose a learning route.</li>
              <li>Work through a relevant resource or practical task.</li>
              <li>Retain a source-linked artifact or assessment.</li>
              <li>Confirm which capability the evidence actually supports.</li>
            </ol>
            <h3>Your prerequisite-aware learning plan</h3>
            <p className="small">
              Ordered from the curated dependency graph. Source-only skills have
              no invented order. Route costs express your preference and
              resource availability, never hours or monetary prices.
            </p>
            {plan?.topicIds.length ? (
              <ol className="planned-topics">
                {plan.topicIds.map((id) => (
                  <li key={id}>
                    <button className="text-button" onClick={() => onTopic(id)}>
                      {topics.find((t) => t.id === id)?.label || id}
                    </button>
                    <small>
                      {plan.selectedRoutes.find((r) => r.topicId === id)?.route}{" "}
                      route · review required
                    </small>
                  </li>
                ))}
              </ol>
            ) : (
              <p>
                No uncompleted learning step is required by this planning graph.
                Formal capability evidence still needs separate assessment.
              </p>
            )}
            <h3>Where this capability can lead</h3>
            <button
              className="secondary"
              onClick={() =>
                onDiscover(
                  topic.skillIds.length
                    ? "skill:" + topic.skillIds[0]
                    : topic.label.split(" ")[0],
                )
              }
            >
              Explore related occupations
            </button>
            <p className="small">
              Related directions are discovery suggestions, never guaranteed
              progression or eligibility.
            </p>
          </>
        )}
        <section className="learning-actions">
          <h3>Learn with this topic</h3>
          <div>
            {[
              ["explain", "Quick Explain"],
              ["teach", "Teach Me"],
              ["quiz", "Quiz Me"],
              ["gap", "Explain My Gap"],
              ["learn", "How Can I Learn This?"],
              ["possibilities", "What Can I Do With This?"],
            ].map(([id, label]) => (
              <button
                className="secondary"
                key={id}
                disabled={busy}
                onClick={() => void act(id as LearningAction)}
              >
                {label}
              </button>
            ))}
          </div>
          <label className="consent-check">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
            />
            Use the configured external AI provider for this request. Only this
            topic and a count of supporting claims are sent; no CV or academic
            record text.
          </label>
        </section>
        {lesson && (
          <section className="lesson" role="status">
            <span className="subtle-tag">
              {lesson.provider === "ai"
                ? "AI-assisted candidate explanation"
                : "Deterministic learning guide"}
            </span>
            <p>{lesson.text}</p>
            <ol>
              {lesson.steps.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ol>
            {lesson.quiz.map((q, i) => (
              <div className="practice-question" key={q.question}>
                <h4>
                  {i + 1}. {q.question}
                </h4>
                {q.options.map((option, n) => (
                  <button
                    key={option}
                    className={answers[i] === n ? "selected" : ""}
                    onClick={() => setAnswers((a) => ({ ...a, [i]: n }))}
                  >
                    {option}
                  </button>
                ))}
                {answers[i] !== undefined && (
                  <p>
                    {answers[i] === q.answer
                      ? "Correct. "
                      : "Review this answer. "}
                    {q.explanation}
                  </p>
                )}
              </div>
            ))}
            <p className="small">{lesson.notice}</p>
          </section>
        )}
        <div className="detail-actions">
          <button
            className="primary"
            onClick={() => onProgress(topic.id, "completed")}
          >
            <Check size={15} />
            Mark completed
          </button>
          <button
            className="secondary"
            onClick={() => onProgress(topic.id, "working")}
          >
            <Play size={14} />
            Start working
          </button>
          <button
            className="text-button"
            onClick={() => onProgress(topic.id, "reset")}
          >
            <RotateCcw size={14} />
            Reset progress
          </button>
          <small>
            Completion is self-reported. It never creates a verified capability
            or credential.
          </small>
        </div>
      </div>
    </aside>
  );
}
