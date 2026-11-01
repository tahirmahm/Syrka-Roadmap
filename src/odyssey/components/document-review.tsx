"use client";
import { useEffect, useRef, useState } from "react";
import {
  Upload,
  X,
  FileText,
  Check,
  Trash2,
  ShieldCheck,
  Plus,
} from "lucide-react";
import type {
  Person,
  Claim,
  ClaimKind,
  ExtractedDocument,
  Course,
  EducationState,
} from "../types";
import {
  extractDocument,
  extractClaims,
  approveClaims,
  mergeCandidateClaims,
} from "../documents";
import { mapText } from "../catalogue";
import { getVocabulary, jsonRequest } from "../client";
const kinds: ClaimKind[] = [
  "education",
  "qualification",
  "course",
  "employment",
  "internship",
  "volunteering",
  "project",
  "publication",
  "language",
  "skill",
  "award",
  "interest",
  "learning-outcome",
  "assessment",
  "other",
];
export function DocumentReview({
  person,
  academic = false,
  initialText,
  sourceLabel,
  onClose,
  onApprove,
}: {
  person: Person;
  academic?: boolean;
  initialText?: string;
  sourceLabel?: string;
  onClose: () => void;
  onApprove: (p: Person, docId: string, next?: "profile" | "discover") => void;
}) {
  const [stage, setStage] = useState<
      "queued" | "processing" | "review-required" | "completed" | "failed"
    >("queued"),
    [consent, setConsent] = useState(false),
    [doc, setDoc] = useState<ExtractedDocument | null>(null),
    [claims, setClaims] = useState<Claim[]>([]),
    [message, setMessage] = useState(""),
    [progress, setProgress] = useState(0),
    [name, setName] = useState(
      person.name === "Your profile" ? "" : person.name,
    ),
    [visible, setVisible] = useState(12),
    [external, setExternal] = useState(false),
    [pastedText, setPastedText] = useState(initialText || ""),
    [aiBusy, setAiBusy] = useState(false),
    [mappingBusy, setMappingBusy] = useState<string | null>(null),
    [academicFields, setAcademicFields] = useState({
      institution: "",
      programme: "",
      code: "",
      title: "",
      grade: "",
      credits: "",
      status: "unknown" as Course["status"],
    }),
    [mappingQuery, setMappingQuery] = useState(""),
    [mappingTarget, setMappingTarget] = useState<string | null>(null),
    [mappingResults, setMappingResults] = useState<
      { id: string; label: string }[]
    >([]);
  const controller = useRef<AbortController | null>(null),
    dialog = useRef<HTMLDivElement>(null),
    input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const before = document.activeElement as HTMLElement;
    dialog.current?.querySelector<HTMLElement>("button")?.focus();
    return () => {
      controller.current?.abort();
      before?.focus();
    };
  }, []);
  useEffect(() => {
    if (!mappingTarget || mappingQuery.length < 2) return;
    const abort = new AbortController();
    const timer = setTimeout(
      () =>
        jsonRequest<{ skills: { id: string; label: string }[] }>(
          "/api/catalogue?mode=skills&q=" + encodeURIComponent(mappingQuery),
          { signal: abort.signal },
        )
          .then((x) => setMappingResults(x.skills))
          .catch(() => setMappingResults([])),
      200,
    );
    return () => {
      clearTimeout(timer);
      abort.abort();
    };
  }, [mappingQuery, mappingTarget]);
  const patch = (id: string, p: Partial<Claim>) =>
    setClaims((cs) => cs.map((c) => (c.id === id ? { ...c, ...p } : c)));
  const reviewDocument = async (
    document: ExtractedDocument,
    signal: AbortSignal,
  ) => {
    setMessage("Matching candidate skills against the source vocabulary");
    const vocab = await getVocabulary();
    const parsed = await extractClaims(document, vocab, (n) =>
      setMessage(`Reviewing ${n} extracted lines locally`),
    );
    if (signal.aborted) return;
    setDoc(document);
    setClaims(parsed);
    setName(
      (current) =>
        current ||
        parsed.find((c) => c.section === "Profile")?.text.slice(0, 100) ||
        "",
    );
    if (external) {
      setMessage(
        "Qwen is interpreting the extracted text; local claims are retained.",
      );
      try {
        const result = await jsonRequest<{ claims?: Claim[]; notice?: string }>(
          "/api/cv/interpret",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              consent: true,
              pages: document.pages.map((p) => ({
                number: p.number,
                text: p.text.slice(0, 15000),
              })),
            }),
            signal,
          },
        );
        if (signal.aborted) return;
        if (result.claims)
          setClaims(mergeCandidateClaims(parsed, result.claims));
        setMessage(
          result.notice ||
            "Qwen candidate interpretations added; review source quotations.",
        );
      } catch {
        if (signal.aborted) return;
        setMessage(
          "Qwen is unavailable. Your local extraction is intact and ready for review.",
        );
      }
    }
    setStage("review-required");
    if (!external)
      setMessage(
        "Capabilities are selected automatically. Continue to discover careers, or refine any claim first. Nothing is institutionally verified.",
      );
    setProgress(1);
  };
  const startText = async () => {
    if (!consent || pastedText.trim().length < 30) return;
    controller.current?.abort();
    const abort = new AbortController();
    controller.current = abort;
    setStage("processing");
    setMessage("Reading pasted résumé text");
    setProgress(0);
    try {
      if (pastedText.length > 60000)
        throw new Error("Pasted résumé exceeds 60,000 characters.");
      await reviewDocument(
        {
          id: crypto.randomUUID(),
          name: sourceLabel?.trim().slice(0, 200) || "Pasted résumé.txt",
          mime: "text/plain",
          pages: [{ number: 1, text: pastedText.trim(), method: "text" }],
          status: "review-required",
          createdAt: new Date().toISOString(),
        },
        abort.signal,
      );
    } catch {
      if (!abort.signal.aborted) {
        setStage("failed");
        setMessage(
          "Could not process pasted text. Try a shorter extract or a document upload.",
        );
      }
    }
  };
  const start = async (file: File) => {
    if (!consent) return;
    controller.current?.abort();
    const abort = new AbortController();
    controller.current = abort;
    setStage("processing");
    setMessage("Queued for local processing");
    setProgress(0);
    try {
      const document = await extractDocument(
        file,
        (m, p) => {
          setMessage(m);
          setProgress(p);
        },
        abort.signal,
      );
      if (abort.signal.aborted) return;
      await reviewDocument(document, abort.signal);
    } catch (e) {
      if (abort.signal.aborted) {
        setStage("queued");
        setMessage("Processing cancelled.");
      } else {
        setStage("failed");
        setMessage((e as Error).message);
      }
    }
  };
  return (
    <div className="modal-backdrop">
      <div
        ref={dialog}
        className="document-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="document-title"
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            controller.current?.abort();
            onClose();
          }
          if (e.key === "Tab") {
            const all = Array.from(
              e.currentTarget.querySelectorAll<HTMLElement>(
                "button:not([disabled]),input:not([disabled]),select,textarea,a[href]",
              ),
            );
            if (e.shiftKey && document.activeElement === all[0]) {
              e.preventDefault();
              all.at(-1)?.focus();
            } else if (!e.shiftKey && document.activeElement === all.at(-1)) {
              e.preventDefault();
              all[0]?.focus();
            }
          }
        }}
      >
        <div className="document-heading">
          <div>
            <span className="eyebrow">
              {academic
                ? "CONNECT LEARNING TO EVIDENCE"
                : "FROM YOUR STORY TO YOUR POSSIBILITIES"}
            </span>
            <h2 id="document-title">
              {academic
                ? "Import academic records"
                : initialText
                  ? "Review your work as evidence"
                  : "Add your CV"}
            </h2>
          </div>
          <button
            className="icon-button"
            aria-label="Close document import"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>
        <div className="import-stages" aria-label="Document processing stage">
          {["Upload", "Extract", "Review", "Confirm"].map((s, i) => (
            <span
              className={
                i <=
                (stage === "review-required"
                  ? 2
                  : stage === "processing"
                    ? 1
                    : stage === "completed"
                      ? 3
                      : 0)
                  ? "active"
                  : ""
              }
              key={s}
            >
              {i + 1}. {s}
            </span>
          ))}
        </div>
        {(stage === "queued" || stage === "failed") && (
          <>
            <p>
              {academic
                ? "Use a transcript, syllabus, certificate or assessment summary. Course titles alone do not establish competencies."
                : "PDF and DOCX text is extracted directly. Scans and images use local English OCR. You review every claim and mapping."}
            </p>
            <label className="consent-check">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
              />
              I’m authorized to process these records and consent to storing
              only the claims I confirm in this browser.
            </label>
            {!academic && (
              <label className="consent-check">
                <input
                  type="checkbox"
                  checked={external}
                  onChange={(e) => setExternal(e.target.checked)}
                />
                Use Qwen to interpret this CV after text extraction. I consent
                to sending extracted text for this request; local extraction
                remains available.
              </label>
            )}
            <div
              className={`drop-zone ${!consent ? "disabled" : ""}`}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (consent && e.dataTransfer.files[0])
                  void start(e.dataTransfer.files[0]);
              }}
            >
              <Upload size={30} />
              <h3>Drop a document here</h3>
              <p>PDF, DOCX, PNG or JPEG · up to 8 MB / 20 PDF pages</p>
              <button
                className="primary"
                disabled={!consent}
                onClick={() => input.current?.click()}
              >
                Choose file
              </button>
              <input
                ref={input}
                type="file"
                className="sr-only"
                aria-label="Select CV or academic document"
                disabled={!consent}
                accept=".pdf,.docx,.png,.jpg,.jpeg,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/png,image/jpeg"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void start(f);
                }}
              />
            </div>
            {!academic && (
              <details open={!!initialText}>
                <summary>
                  {initialText
                    ? "Review source work text"
                    : "Paste résumé text instead"}
                </summary>
                {initialText && (
                  <p className="small">
                    User-authored work offered for review. This is not an
                    institutional record or independent verification of
                    competence. Correct or remove any claim before approving it.
                  </p>
                )}
                <label>
                  Paste résumé text
                  <textarea
                    aria-label="Paste résumé text"
                    maxLength={60000}
                    rows={8}
                    disabled={!consent}
                    value={pastedText}
                    onChange={(e) => setPastedText(e.target.value)}
                  />
                </label>
                <p className="small">
                  Up to 60,000 characters. Text uses the same local extraction,
                  review and source-provenance pipeline.
                </p>
                <button
                  className="secondary"
                  disabled={!consent || pastedText.trim().length < 30}
                  onClick={() => void startText()}
                >
                  Build profile from text
                </button>
              </details>
            )}
            <div className="privacy-note">
              <ShieldCheck size={18} />
              <p>
                Files are processed locally and are not uploaded or published.
                No macros or PDF document scripts are executed. Large or
                non-English scans may need a clearer export or a separately
                configured OCR service.
              </p>
            </div>
          </>
        )}
        {stage === "processing" && (
          <div className="processing-state">
            <FileText size={36} />
            <h3>Reading your document</h3>
            <p role="status">{message}</p>
            <progress max="1" value={progress} />
            <button
              className="secondary"
              onClick={() => {
                controller.current?.abort();
                setStage("queued");
                setMessage(
                  "Processing cancelled. Your saved profile is unchanged.",
                );
              }}
            >
              Cancel processing
            </button>
          </div>
        )}
        {stage === "failed" && (
          <p className="error" role="alert">
            {message} You can choose another file, retry, or continue manually.
          </p>
        )}
        {stage === "review-required" && doc && (
          <>
            <div className="review-summary">
              <span className="status-chip">Review required</span>
              <p>
                {doc.name} · {doc.pages.length} pages ·{" "}
                {doc.pages.filter((p) => p.method === "ocr").length} OCR pages ·{" "}
                {claims.length} candidate claims
              </p>
              <p className="small">
                Claims are user-submitted, not institutionally verified.
                Confirmed mapping means “this document makes this claim”, not
                proof of mastery.
              </p>
            </div>
            <div className="form-grid">
              <label>
                Your display name
                <input value={name} onChange={(e) => setName(e.target.value)} />
              </label>
              {academic && (
                <>
                  <label>
                    Institution
                    <input
                      value={academicFields.institution}
                      onChange={(e) =>
                        setAcademicFields({
                          ...academicFields,
                          institution: e.target.value,
                        })
                      }
                    />
                  </label>
                  <label>
                    Programme
                    <input
                      value={academicFields.programme}
                      onChange={(e) =>
                        setAcademicFields({
                          ...academicFields,
                          programme: e.target.value,
                        })
                      }
                    />
                  </label>
                  <label>
                    Course title
                    <input
                      value={academicFields.title}
                      onChange={(e) =>
                        setAcademicFields({
                          ...academicFields,
                          title: e.target.value,
                        })
                      }
                    />
                  </label>
                  <label>
                    Course code
                    <input
                      value={academicFields.code}
                      onChange={(e) =>
                        setAcademicFields({
                          ...academicFields,
                          code: e.target.value,
                        })
                      }
                    />
                  </label>
                  <label>
                    Reported grade
                    <input
                      aria-label="Reported course grade"
                      maxLength={200}
                      value={academicFields.grade}
                      onChange={(e) =>
                        setAcademicFields({
                          ...academicFields,
                          grade: e.target.value,
                        })
                      }
                    />
                  </label>
                  <label>
                    Reported credits
                    <input
                      aria-label="Reported course credits"
                      type="number"
                      min={0}
                      max={100}
                      value={academicFields.credits}
                      onChange={(e) =>
                        setAcademicFields({
                          ...academicFields,
                          credits: e.target.value,
                        })
                      }
                    />
                  </label>
                  <label>
                    Reported completion
                    <select
                      value={academicFields.status}
                      onChange={(e) =>
                        setAcademicFields({
                          ...academicFields,
                          status: e.target.value as Course["status"],
                        })
                      }
                    >
                      <option value="unknown">Unknown</option>
                      <option value="reported-complete">
                        Reported complete
                      </option>
                      <option value="in-progress">In progress</option>
                    </select>
                  </label>
                </>
              )}
            </div>
            <p className="small" role="status">
              Local text/OCR extraction and deterministic ontology matching. AI
              interpretation is optional; inferred mappings remain suggestions.
              All detected capabilities are selected initially and can be
              deselected below.
            </p>
            <p aria-live="polite">
              {claims.reduce(
                (n, c) =>
                  n +
                  (c.approved
                    ? c.mappings.filter((m) => m.selected ?? m.confirmed).length
                    : 0),
                0,
              )}{" "}
              selected capabilities across the complete document.
            </p>
            <div className="review-actions">
              <button
                className="secondary"
                onClick={() =>
                  setClaims((cs) =>
                    cs.map((c) => ({
                      ...c,
                      approved: true,
                      mappings: c.mappings.map((m) => ({
                        ...m,
                        selected: true,
                      })),
                    })),
                  )
                }
              >
                Select All capabilities (
                {claims.reduce((n, c) => n + c.mappings.length, 0)})
              </button>
              <button
                className="secondary"
                onClick={() =>
                  setClaims((cs) =>
                    cs.map((c) => ({
                      ...c,
                      mappings: c.mappings.map((m) => ({
                        ...m,
                        selected: false,
                      })),
                    })),
                  )
                }
              >
                Deselect All capabilities
              </button>
              <button
                className="secondary"
                onClick={() => {
                  const seen = new Set<string>();
                  setClaims((cs) =>
                    cs.map((c) => {
                      const key = c.kind + ":" + c.text.toLowerCase().trim();
                      if (seen.has(key)) return { ...c, approved: false };
                      seen.add(key);
                      return c;
                    }),
                  );
                }}
              >
                Uncheck exact duplicates
              </button>
              <button
                className="secondary"
                onClick={() =>
                  setClaims((cs) => [
                    ...cs,
                    {
                      id: crypto.randomUUID(),
                      kind: "other",
                      text: "",
                      quote:
                        "User-added correction; no document quotation supplied.",
                      page: 1,
                      section: "User correction",
                      mappings: [],
                      approved: true,
                    },
                  ])
                }
              >
                <Plus size={15} />
                Add a claim
              </button>
            </div>
            <div className="claims-list">
              {claims.slice(0, visible).map((c, index) => (
                <article
                  className={`claim-card ${!c.approved ? "excluded" : ""}`}
                  key={c.id}
                >
                  <div className="claim-top">
                    <label className="inline-check">
                      <input
                        type="checkbox"
                        checked={c.approved}
                        onChange={(e) =>
                          patch(c.id, { approved: e.target.checked })
                        }
                      />
                      Include claim {index + 1}
                    </label>
                    <select
                      aria-label={`Type for claim ${index + 1}`}
                      value={c.kind}
                      onChange={(e) =>
                        patch(c.id, { kind: e.target.value as ClaimKind })
                      }
                    >
                      {kinds.map((k) => (
                        <option key={k}>{k}</option>
                      ))}
                    </select>
                    <button
                      className="icon-button"
                      aria-label={`Remove claim ${index + 1}`}
                      onClick={() => patch(c.id, { approved: false })}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                  <label className="sr-only" htmlFor={"claim-" + c.id}>
                    Claim {index + 1} text
                  </label>
                  <textarea
                    id={"claim-" + c.id}
                    value={c.text}
                    maxLength={3500}
                    onChange={(e) =>
                      patch(c.id, { text: e.target.value, mappings: [] })
                    }
                  />
                  {c.text !== c.quote && (
                    <div className="review-actions">
                      <p className="small">
                        Corrected text is self-reported. Refresh suggestions for
                        the new wording; the original source quote is retained.
                      </p>
                      <button
                        className="secondary"
                        disabled={mappingBusy !== null}
                        aria-label={`Refresh capability suggestions for claim ${index + 1}`}
                        onClick={async () => {
                          setMappingBusy(c.id);
                          try {
                            const skills = await getVocabulary();
                            const suggestions = mapText(c.text, skills).map(
                              (m) => ({ ...m, selected: true }),
                            );
                            setClaims((current) =>
                              current.map((x) =>
                                x.id === c.id && x.text === c.text
                                  ? { ...x, mappings: suggestions }
                                  : x,
                              ),
                            );
                          } catch {
                            setMessage(
                              "Capability lookup is unavailable. Keep the corrected claim and add mappings manually when available.",
                            );
                          } finally {
                            setMappingBusy(null);
                          }
                        }}
                      >
                        Refresh capability suggestions
                      </button>
                    </div>
                  )}
                  {["education", "qualification", "course"].includes(
                    c.kind,
                  ) && (
                    <div className="form-grid">
                      <label>
                        Education status for claim {index + 1}
                        <select
                          value={c.educationState || "unknown"}
                          onChange={(e) =>
                            patch(c.id, {
                              educationState: e.target.value as EducationState,
                              interpretation: "user-reviewed",
                            })
                          }
                        >
                          {[
                            "unknown",
                            "attended",
                            "current",
                            "completed",
                            "withdrawn",
                            "transferred",
                            "incomplete",
                          ].map((v) => (
                            <option key={v} value={v}>
                              {v}
                            </option>
                          ))}
                        </select>
                      </label>
                      <p className="small">
                        Attendance is not a degree. Completion remains a
                        user-reviewed claim, not institutional verification.
                      </p>
                      <label>
                        Institution (confirm or correct)
                        <input
                          value={c.institution || ""}
                          onChange={(e) =>
                            patch(c.id, { institution: e.target.value })
                          }
                        />
                      </label>
                      <label>
                        Grade / mark as stated
                        <input
                          value={c.grade || ""}
                          onChange={(e) =>
                            patch(c.id, { grade: e.target.value })
                          }
                        />
                      </label>
                    </div>
                  )}
                  <details>
                    <summary>
                      Source: page/text unit {c.page} · {c.section}
                    </summary>
                    <blockquote>{c.quote}</blockquote>
                    {c.dates && (
                      <p className="small">Dates stated in source: {c.dates}</p>
                    )}
                  </details>
                  {c.mappings.length > 0 && (
                    <div className="mapping-list">
                      <strong>
                        Detected capabilities — selected for discovery; refine
                        any match
                      </strong>
                      {c.mappings.map((m) => (
                        <label className="inline-check" key={m.skillId}>
                          <input
                            type="checkbox"
                            aria-label={`Confirm ${m.label} mapping for claim ${index + 1}`}
                            checked={m.selected ?? m.confirmed}
                            onChange={(e) =>
                              patch(c.id, {
                                approved: e.target.checked ? true : c.approved,
                                mappings: c.mappings.map((x) =>
                                  x.skillId === m.skillId
                                    ? {
                                        ...x,
                                        confirmed: e.target.checked,
                                        selected: e.target.checked,
                                      }
                                    : x,
                                ),
                              })
                            }
                          />
                          <span>
                            {m.label}
                            <small>
                              {m.method} match · {m.confidence} lexical
                              confidence
                            </small>
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                  <button
                    className="text-button"
                    onClick={() => {
                      setMappingTarget(c.id);
                      setMappingQuery("");
                      setMappingResults([]);
                    }}
                  >
                    Find an ontology skill
                  </button>
                  {mappingTarget === c.id && (
                    <div className="mapping-search">
                      <input
                        aria-label="Search skill mappings"
                        placeholder="Search source-defined skills"
                        value={mappingQuery}
                        onChange={(e) => setMappingQuery(e.target.value)}
                      />
                      {mappingResults.slice(0, 10).map((m) => (
                        <button
                          key={m.id}
                          onClick={() => {
                            if (!c.mappings.some((x) => x.skillId === m.id))
                              patch(c.id, {
                                approved: true,
                                mappings: [
                                  ...c.mappings,
                                  {
                                    skillId: m.id,
                                    label: m.label,
                                    method: "user-confirmed",
                                    confidence: "medium",
                                    confirmed: true,
                                  },
                                ],
                              });
                            setMappingTarget(null);
                          }}
                        >
                          {m.label}
                          <Plus size={12} />
                        </button>
                      ))}
                    </div>
                  )}
                </article>
              ))}
            </div>
            {visible < claims.length && (
              <button
                className="secondary load-more"
                onClick={() => setVisible((v) => v + 12)}
              >
                Show {Math.min(12, claims.length - visible)} more claims
              </button>
            )}
            <details className="optional-ai">
              <summary>Optional AI-assisted interpretation</summary>
              <p className="small">
                Requires a configured provider, signed-in account and available
                budget. The document text would be sent to the configured
                provider only after explicit consent. The source file and images
                are never sent by this action.
              </p>
              <label className="consent-check">
                <input
                  type="checkbox"
                  checked={external}
                  onChange={(e) => setExternal(e.target.checked)}
                />
                I consent to sending extracted document text for this one
                interpretation request.
              </label>
              <button
                className="secondary"
                disabled={!external || aiBusy}
                onClick={async () => {
                  setAiBusy(true);
                  try {
                    const r = await jsonRequest<{
                      claims?: Claim[];
                      notice?: string;
                    }>("/api/cv/interpret", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        consent: true,
                        pages: doc.pages.map((p) => ({
                          number: p.number,
                          text: p.text.slice(0, 15000),
                        })),
                      }),
                    });
                    if (r.claims)
                      setClaims((current) =>
                        mergeCandidateClaims(current, r.claims!),
                      );
                    setMessage(
                      r.notice || "AI candidates require your review.",
                    );
                  } catch (e) {
                    setMessage((e as Error).message);
                  } finally {
                    setAiBusy(false);
                  }
                }}
              >
                {aiBusy ? "Interpreting…" : "Interpret text with AI"}
              </button>
              <p role="status" className="small">
                {message}
              </p>
            </details>
            <div className="confirm-bar">
              <p>
                Selected capabilities and included claims are saved with their
                source and uncertainty. Original files are not retained. Delete
                or export your records in My profile.
              </p>
              <button
                className="primary"
                disabled={
                  mappingBusy !== null ||
                  !name.trim() ||
                  (academic &&
                    (!academicFields.institution.trim() ||
                      !academicFields.title.trim()))
                }
                onClick={() => {
                  const p = approveClaims(
                    doc,
                    claims,
                    { ...person, name: name.trim() },
                    academic
                      ? {
                          ...academicFields,
                          credits: academicFields.credits
                            ? Math.min(
                                100,
                                Math.max(
                                  0,
                                  Number(academicFields.credits) || 0,
                                ),
                              )
                            : undefined,
                        }
                      : undefined,
                  );
                  setStage("completed");
                  onApprove(p, doc.id);
                }}
              >
                <Check size={16} />
                Confirm profile
              </button>
              {!academic && (
                <button
                  className="primary"
                  disabled={!name.trim() || mappingBusy !== null}
                  onClick={() => {
                    setStage("completed");
                    onApprove(
                      approveClaims(doc, claims, {
                        ...person,
                        name: name.trim(),
                      }),
                      doc.id,
                      "discover",
                    );
                  }}
                >
                  Continue to career discovery
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
