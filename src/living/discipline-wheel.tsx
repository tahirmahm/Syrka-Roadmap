"use client";
import { useState, type CSSProperties, type KeyboardEvent } from "react";
import {
  ArrowLeft,
  Brain,
  CircuitBoard,
  FlaskConical,
  MessagesSquare,
  BriefcaseBusiness,
  Palette,
  Landmark,
  Layers,
  ChevronRight,
} from "lucide-react";
import type { RadialDomain } from "./radial-projection";

export const appearancePalette = {
  analysis: { tint: "#eeeaf8", accent: "#a895d0", icon: Brain },
  technology: { tint: "#e7eef9", accent: "#8baee2", icon: CircuitBoard },
  research: { tint: "#e8f3ec", accent: "#91bea6", icon: FlaskConical },
  communication: { tint: "#f8eaf0", accent: "#ce9caf", icon: MessagesSquare },
  practice: { tint: "#f7f0e4", accent: "#cdb287", icon: BriefcaseBusiness },
  creative: { tint: "#f0e8f8", accent: "#b59bd3", icon: Palette },
  public: { tint: "#e9f0f2", accent: "#94b6bf", icon: Landmark },
  other: { tint: "#efefed", accent: "#aeaeaa", icon: Layers },
} as const;
const point = (radius: number, angle: number) => ({
  x: 250 + Math.cos((angle * Math.PI) / 180) * radius,
  y: 250 + Math.sin((angle * Math.PI) / 180) * radius,
});
function sectorPath(start: number, end: number) {
  const a = point(180, start),
    b = point(180, end),
    c = point(83, end),
    d = point(83, start),
    large = end - start > 180 ? 1 : 0;
  return `M ${a.x} ${a.y} A 180 180 0 ${large} 1 ${b.x} ${b.y} L ${c.x} ${c.y} A 83 83 0 ${large} 0 ${d.x} ${d.y} Z`;
}
function labelLines(label: string) {
  const words = label.split(/\s+/),
    lines: string[] = [];
  let line = "";
  for (const word of words) {
    if (line && (line + " " + word).length > 12) {
      lines.push(line);
      line = word;
    } else line += (line ? " " : "") + word;
  }
  if (line) lines.push(line);
  return lines.slice(0, 3);
}
export function DisciplineWheel({
  domains,
  activeDomainId,
  onSelectDomain,
  compact = false,
  onOverview,
}: {
  domains: RadialDomain[];
  activeDomainId?: string | null;
  onSelectDomain: (id: string) => void;
  compact?: boolean;
  onOverview?: () => void;
}) {
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);
  const previewId = hoverId || focusId;
  const clearPreview = () => {
    setHoverId(null);
    setFocusId(null);
  };
  const [page, setPage] = useState(() =>
    Math.max(
      0,
      Math.floor(domains.findIndex((d) => d.id === activeDomainId) / 8),
    ),
  );
  const totalPages = Math.max(1, Math.ceil(domains.length / 8));
  const safePage =
    compact && activeDomainId
      ? Math.max(
          0,
          Math.floor(domains.findIndex((d) => d.id === activeDomainId) / 8),
        )
      : Math.min(page, totalPages - 1);
  const visibleDomains = domains.slice(safePage * 8, safePage * 8 + 8);
  const current = domains.find((d) => d.id === (previewId || activeDomainId));
  const count = visibleDomains.length,
    step = count ? 360 / count : 360;
  const commit = (id: string) => {
    clearPreview();
    onSelectDomain(id);
  };
  const key = (e: KeyboardEvent<SVGGElement>, id: string) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      commit(id);
    }
  };
  if (compact)
    return (
      <section
        className="discipline-wheel is-compact"
        aria-label="Discipline wheel navigation"
        data-active-domain={activeDomainId || ""}
      >
        <button
          className="wheel-return"
          onClick={onOverview}
          aria-label="Return to discipline wheel"
        >
          <svg
            viewBox="0 0 500 500"
            aria-hidden="true"
            className="wheel-miniature"
          >
            {visibleDomains.map((d, i) => (
              <path
                key={d.id}
                d={sectorPath(
                  -90 - step / 2 + i * step + 1.5,
                  -90 - step / 2 + (i + 1) * step - 1.5,
                )}
                fill={appearancePalette[d.appearance].tint}
                className={d.id === activeDomainId ? "mini-is-active" : ""}
              />
            ))}
          </svg>
          <span>
            <ArrowLeft size={13} /> Disciplines
          </span>
        </button>
        {current && <p className="wheel-anchor-label">{current.label}</p>}
      </section>
    );
  return (
    <section
      className="discipline-wheel"
      aria-label="Discipline wheel"
      data-preview-domain={previewId || ""}
      data-active-domain={activeDomainId || ""}
      data-domain-page={safePage}
    >
      <div className="wheel-drawing">
        <svg
          viewBox="0 0 500 500"
          className="discipline-wheel-svg"
          aria-label="Choose a discipline"
          role="group"
        >
          <g className="wheel-preview-buds" aria-hidden="true">
            {visibleDomains.map((d, i) => {
              if (!d.rootIds.length) return null;
              const angle = -90 + i * step,
                attachment = point(182, angle),
                bud = point(218, angle),
                twig = point(235, angle + Math.min(5, step * 0.08));
              const palette = appearancePalette[d.appearance],
                highlight = (previewId || activeDomainId) === d.id;
              return (
                <g
                  key={d.id}
                  className={`wheel-bud ${highlight ? "is-highlighted" : ""}`}
                  style={{ "--sector-accent": palette.accent } as CSSProperties}
                >
                  <path
                    d={`M ${attachment.x} ${attachment.y} Q ${(attachment.x + bud.x) / 2} ${(attachment.y + bud.y) / 2} ${bud.x} ${bud.y}`}
                  />
                  <circle cx={attachment.x} cy={attachment.y} r="3" />
                  <circle cx={bud.x} cy={bud.y} r="5" />
                  {d.rootIds.length > 1 && (
                    <>
                      <path d={`M ${bud.x} ${bud.y} L ${twig.x} ${twig.y}`} />
                      <circle cx={twig.x} cy={twig.y} r="3" />
                    </>
                  )}
                </g>
              );
            })}
          </g>
          <g className="wheel-sectors">
            {visibleDomains.map((domain, i) => {
              const start = -90 - step / 2 + i * step + 1.5,
                end = -90 - step / 2 + (i + 1) * step - 1.5,
                angle = -90 + i * step;
              const position = point(132, angle),
                palette = appearancePalette[domain.appearance],
                Icon = palette.icon,
                lines = labelLines(domain.label),
                preview = previewId === domain.id,
                selected = activeDomainId === domain.id;
              return (
                <g
                  key={domain.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`Open ${domain.label}`}
                  aria-pressed={selected}
                  data-domain-id={domain.id}
                  data-empty={domain.count === 0 ? "true" : "false"}
                  className={`wheel-sector ${preview ? "is-previewed" : ""} ${selected ? "is-selected" : ""}`}
                  style={
                    {
                      "--sector-tint": palette.tint,
                      "--sector-accent": palette.accent,
                    } as CSSProperties
                  }
                  onPointerEnter={(e) => {
                    if (e.pointerType !== "touch") setHoverId(domain.id);
                  }}
                  onPointerLeave={() => setHoverId(null)}
                  onFocus={() => setFocusId(domain.id)}
                  onBlur={() => setFocusId(null)}
                  onClick={() => commit(domain.id)}
                  onKeyDown={(e) => key(e, domain.id)}
                >
                  <title>{`${domain.label} · ${domain.count} linked topics. Click to explore.`}</title>
                  <path
                    className="wheel-sector-face"
                    d={sectorPath(start, end)}
                  />
                  <path
                    className="wheel-sector-outline"
                    d={sectorPath(start, end)}
                    fill="none"
                  />
                  <g className="wheel-sector-caption" pointerEvents="none">
                    <Icon
                      x={position.x - 13}
                      y={position.y - 27}
                      width={26}
                      height={26}
                      strokeWidth={1.55}
                    />
                    <text
                      x={position.x}
                      y={position.y + 18 - (lines.length - 1) * 7}
                      textAnchor="middle"
                    >
                      {lines.map((line, index) => (
                        <tspan
                          key={index}
                          x={position.x}
                          dy={index === 0 ? 0 : 16}
                        >
                          {line}
                        </tspan>
                      ))}
                    </text>
                  </g>
                </g>
              );
            })}
          </g>
          {!count && (
            <circle cx="250" cy="250" r="132" className="wheel-empty-ring" />
          )}
          <circle cx="250" cy="250" r="79" className="wheel-centre-disc" />
        </svg>
        <div className="wheel-centre" aria-hidden="true">
          <span>Your path</span>
          <strong>
            {current?.label ||
              (count ? "Choose a discipline" : "Add your background")}
          </strong>
          {count > 0 && <ChevronRight size={15} />}
        </div>
      </div>
      <p className="wheel-instruction">
        {current
          ? `Open ${current.label.toLowerCase()} to explore its preparation.`
          : count
            ? "Choose a discipline to see where it can lead."
            : "Your reviewed capabilities will shape the disciplines shown here."}
      </p>
      {totalPages > 1 && (
        <nav className="wheel-domain-pages" aria-label="Additional disciplines">
          <button
            aria-label="Previous discipline page"
            disabled={safePage === 0}
            onClick={() => {
              clearPreview();
              setPage(safePage - 1);
            }}
          >
            <ArrowLeft size={14} />
          </button>
          <span>
            Disciplines {safePage * 8 + 1}–
            {Math.min((safePage + 1) * 8, domains.length)} of {domains.length}
          </span>
          <button
            aria-label="Next discipline page"
            disabled={safePage === totalPages - 1}
            onClick={() => {
              clearPreview();
              setPage(safePage + 1);
            }}
          >
            <ChevronRight size={14} />
          </button>
        </nav>
      )}
    </section>
  );
}
