import { unzipSync } from "fflate";
import { XMLParser } from "fast-xml-parser";
import type {
  ExtractedDocument,
  Claim,
  ClaimKind,
  OntologySkill,
  Person,
  Course,
  Assertion,
} from "./types";
import { mapText } from "./catalogue";
export const MAX_DOCUMENT_BYTES = 8 * 1024 * 1024;
export const MAX_DOCUMENT_PAGES = 20;
export function validateDocument(
  bytes: Uint8Array,
  name: string,
  mime: string,
) {
  if (bytes.length > MAX_DOCUMENT_BYTES)
    throw new Error("Maximum file size is 8 MB.");
  if (bytes.length < 8) throw new Error("The file is empty or invalid.");
  const ext = name.toLowerCase().split(".").pop();
  const kind =
    String.fromCharCode(...bytes.slice(0, 5)) === "%PDF-"
      ? "pdf"
      : bytes[0] === 0x89 && String.fromCharCode(...bytes.slice(1, 4)) === "PNG"
        ? "png"
        : bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
          ? "jpeg"
          : bytes[0] === 0x50 &&
              bytes[1] === 0x4b &&
              bytes[2] === 3 &&
              bytes[3] === 4
            ? "docx"
            : null;
  const expected =
    kind === "pdf"
      ? "application/pdf"
      : kind === "docx"
        ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        : kind === "png"
          ? "image/png"
          : kind === "jpeg"
            ? "image/jpeg"
            : "";
  if (
    !kind ||
    !(
      (kind === "jpeg" && ["jpg", "jpeg"].includes(ext || "")) ||
      ext === kind
    ) ||
    (mime && !["application/octet-stream", expected].includes(mime))
  )
    throw new Error(
      "File contents, extension and MIME type do not agree. Use PDF, DOCX, PNG or JPEG.",
    );
  if (kind === "png") {
    if (bytes.length < 24) throw new Error("Invalid PNG header.");
    const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    if (v.getUint32(16) * v.getUint32(20) > 12000000)
      throw new Error("Image is too large. Maximum is 12 megapixels.");
  }
  if (kind === "jpeg") {
    let i = 2;
    while (i + 8 < bytes.length) {
      if (bytes[i] !== 255) {
        i++;
        continue;
      }
      const marker = bytes[i + 1];
      if (marker === 0xd9 || marker === 0xda) break;
      const size = (bytes[i + 2] << 8) + bytes[i + 3];
      if (size < 2) break;
      if (
        [
          0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd,
          0xce, 0xcf,
        ].includes(marker)
      ) {
        const h = (bytes[i + 5] << 8) + bytes[i + 6],
          w = (bytes[i + 7] << 8) + bytes[i + 8];
        if (w * h > 12000000)
          throw new Error("Image is too large. Maximum is 12 megapixels.");
        break;
      }
      i += size + 2;
    }
  }
  return kind;
}
export function extractDocx(bytes: Uint8Array) {
  let total = 0,
    count = 0;
  const files = unzipSync(bytes, {
    filter: (entry) => {
      if (++count > 500) throw new Error("Too many document parts.");
      if (entry.originalSize > 16 * 1024 * 1024)
        throw new Error("An expanded document part is too large.");
      const wanted = [
        "word/document.xml",
        "word/footnotes.xml",
        "word/endnotes.xml",
      ].includes(entry.name);
      if (wanted) total += entry.originalSize;
      if (total > 16 * 1024 * 1024)
        throw new Error("Expanded text exceeds the processing limit.");
      return wanted;
    },
  });
  if (!files["word/document.xml"])
    throw new Error("This is not a valid DOCX document.");
  const parser = new XMLParser({
    ignoreAttributes: true,
    processEntities: true,
    preserveOrder: true,
  });
  const collect = (value: unknown): string => {
    if (Array.isArray(value)) return value.map(collect).join("");
    if (value && typeof value === "object")
      return Object.entries(value)
        .map(([k, v]) =>
          k === "#text"
            ? String(v)
            : k === "w:p"
              ? collect(v) + "\n"
              : k === "w:tab"
                ? "\t"
                : k === "w:br"
                  ? "\n"
                  : collect(v),
        )
        .join("");
    return "";
  };
  return Object.values(files)
    .map((bytes) => {
      const xml = new TextDecoder().decode(bytes);
      if (/<!DOCTYPE|<!ENTITY/i.test(xml))
        throw new Error("Unsafe XML declarations are not supported.");
      return collect(parser.parse(xml));
    })
    .join("\n")
    .slice(0, 100000);
}
export async function extractDocument(
  file: File,
  onProgress: (message: string, progress: number) => void,
  signal?: AbortSignal,
): Promise<ExtractedDocument> {
  const bytes = new Uint8Array(await file.arrayBuffer()),
    kind = validateDocument(bytes, file.name, file.type),
    pages: ExtractedDocument["pages"] = [];
  const base = process.env.NEXT_PUBLIC_BASE_PATH || "";
  let worker: Awaited<
    ReturnType<(typeof import("tesseract.js"))["createWorker"]>
  > | null = null;
  const check = () => {
    if (signal?.aborted) throw new Error("Processing cancelled.");
  };
  const ocr = async (image: HTMLCanvasElement | File) => {
    check();
    onProgress(
      "Recognizing text locally. Your document is not uploaded.",
      0.45,
    );
    if (!worker) {
      const { createWorker } = await import("tesseract.js");
      worker = await createWorker("eng", 1, {
        workerPath: base + "/document/ocr/worker.min.js",
        corePath: base + "/document/ocr",
        langPath: base + "/document/ocr/lang",
        workerBlobURL: false,
        logger: (m) => {
          if (m.status === "recognizing text")
            onProgress("Reading scanned text locally", 0.4 + m.progress * 0.45);
        },
      });
    }
    const result = await worker.recognize(image);
    check();
    return result.data.text;
  };
  const abort = () => {
    void worker?.terminate();
  };
  signal?.addEventListener("abort", abort, { once: true });
  try {
    check();
    onProgress("Validating document and extracting text", 0.1);
    if (kind === "docx")
      pages.push({ number: 1, text: extractDocx(bytes), method: "text" });
    else if (kind === "pdf") {
      const pdfjs = await import("pdfjs-dist");
      pdfjs.GlobalWorkerOptions.workerSrc =
        base + "/document/pdf.worker.min.mjs";
      const loading = pdfjs.getDocument({
        data: bytes,
        enableXfa: false,
        standardFontDataUrl: base + "/document/standard_fonts/",
        wasmUrl: base + "/document/wasm/",
      });
      const pdf = await loading.promise;
      try {
        if (pdf.numPages > MAX_DOCUMENT_PAGES)
          throw new Error("Maximum document length is 20 pages.");
        for (let i = 1; i <= pdf.numPages; i++) {
          check();
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          let text = "";
          let y: number | null = null;
          for (const item of content.items) {
            if (!("str" in item)) continue;
            const iy = item.transform[5];
            if (y !== null && Math.abs(y - iy) > 3) text += "\n";
            text += item.str + (item.hasEOL ? "\n" : " ");
            y = iy;
          }
          let method: "text" | "ocr" = "text";
          const nativeLength = text.replace(/\s/g, "").length;
          const imageOps = new Set<number>([
            pdfjs.OPS.paintImageXObject,
            pdfjs.OPS.paintInlineImageXObject,
            pdfjs.OPS.paintImageMaskXObject,
          ]);
          const operators =
            nativeLength < 40 ? await page.getOperatorList() : null;
          const containsImage =
            operators?.fnArray.some((op) => imageOps.has(op)) || false;
          if (nativeLength === 0 || (nativeLength < 40 && containsImage)) {
            const first = page.getViewport({ scale: 1 });
            const scale = Math.min(
              1.8,
              Math.sqrt(3500000 / (first.width * first.height)),
            );
            const viewport = page.getViewport({ scale });
            const canvas = document.createElement("canvas");
            canvas.width = Math.ceil(viewport.width);
            canvas.height = Math.ceil(viewport.height);
            try {
              await page.render({
                canvas,
                canvasContext: canvas.getContext("2d")!,
                viewport,
              }).promise;
              text = await ocr(canvas);
              method = "ocr";
            } finally {
              canvas.width = 0;
              canvas.height = 0;
            }
          }
          pages.push({ number: i, text: text.slice(0, 100000), method });
          page.cleanup();
          onProgress(
            `Extracted page ${i} of ${pdf.numPages}`,
            0.15 + (0.7 * i) / pdf.numPages,
          );
        }
      } finally {
        await loading.destroy();
      }
    } else pages.push({ number: 1, text: await ocr(file), method: "ocr" });
    check();
    if (!pages.some((p) => p.text.trim().length > 10))
      throw new Error(
        "No readable text found. Try a clearer scan or use the manual profile route.",
      );
    return {
      id: crypto.randomUUID(),
      name: file.name,
      mime: file.type,
      pages,
      status: "review-required",
      createdAt: new Date().toISOString(),
    };
  } finally {
    signal?.removeEventListener("abort", abort);
    if (worker)
      await (
        worker as Awaited<
          ReturnType<(typeof import("tesseract.js"))["createWorker"]>
        >
      ).terminate();
  }
}
const headings: Record<string, ClaimKind> = {
  education: "education",
  éducation: "education",
  formation: "education",
  ausbildung: "education",
  educación: "education",
  vzdělání: "education",
  تعليم: "education",
  التعليم: "education",
  compétences: "skill",
  fähigkeiten: "skill",
  kenntnisse: "skill",
  habilidades: "skill",
  dovednosti: "skill",
  المهارات: "skill",
  "expérience professionnelle": "employment",
  berufserfahrung: "employment",
  "experiencia laboral": "employment",
  "pracovní zkušenosti": "employment",
  الخبرة: "employment",
  projets: "project",
  projekte: "project",
  proyectos: "project",
  projekty: "project",
  langues: "language",
  sprachen: "language",
  idiomas: "language",
  jazyky: "language",
  qualifications: "qualification",
  certifications: "qualification",
  courses: "course",
  employment: "employment",
  "work experience": "employment",
  "professional experience": "employment",
  "research experience": "publication",
  "technical skills": "skill",
  "transferable skills": "skill",
  certificates: "qualification",
  experience: "employment",
  internships: "internship",
  volunteering: "volunteering",
  projects: "project",
  publications: "publication",
  research: "publication",
  languages: "language",
  skills: "skill",
  awards: "award",
  interests: "interest",
  "learning outcomes": "learning-outcome",
  assessments: "assessment",
};
export async function extractClaims(
  doc: ExtractedDocument,
  skills: Pick<OntologySkill, "id" | "label" | "aliases">[],
  onProgress?: (n: number) => void,
) {
  const claims: Claim[] = [];
  let kind: ClaimKind = "other",
    section = "Profile";
  for (const page of doc.pages) {
    const lines = page.text
      .split(/\n+/)
      .map((x) => x.trim())
      .filter(Boolean);
    for (let i = 0; i < lines.length && claims.length < 160; i++) {
      const line = lines[i].slice(0, 1800);
      const header = line.toLowerCase().replace(/[:\s]+$/, "");
      if (headings[header]) {
        kind = headings[header];
        section = line;
        continue;
      }
      const inline = line.match(/^([^:]{2,40}):\s*.+$/);
      if (inline && headings[inline[1].toLowerCase().trim()]) {
        kind = headings[inline[1].toLowerCase().trim()];
        section = inline[1];
      }
      const mappings = mapText(line, skills);
      claims.push({
        id: crypto.randomUUID(),
        kind: kind === "other" && i > 0 && mappings.length ? "skill" : kind,
        text: line,
        quote: line,
        page: page.number,
        section,
        mappings: mappings.map((m) => ({ ...m, selected: true })),
        approved: true,
        institution: /university|college|institute/i.test(line)
          ? line
          : undefined,
        grade: line.match(
          /(?:CGPA|GPA|grade|classification)\s*[:=]?\s*(?:[0-9]+(?:\.[0-9]+)?(?:\/[0-9.]+)?|[A-F](?:[+-])?|first class|upper second)/i,
        )?.[0],
        dates: line
          .match(/(?:19|20)\d{2}(?:\s*[-–]\s*(?:(?:19|20)\d{2}|present))?/gi)
          ?.join("; "),
      });
      if (i % 8 === 0) {
        onProgress?.(claims.length);
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }
  }
  return claims;
}
export function approveClaims(
  doc: Pick<ExtractedDocument, "id" | "name"> &
    Partial<Pick<ExtractedDocument, "pages">>,
  claims: Claim[],
  person: Person,
  academic?: {
    institution: string;
    programme: string;
    code: string;
    title: string;
    grade?: string;
    credits?: number;
    status: Course["status"];
  },
): Person {
  const seen = new Set(
    person.claims.map((c) => c.kind + ":" + c.quote.trim().toLowerCase()),
  );
  const approved = claims.filter((c) => {
    const key = c.kind + ":" + c.quote.trim().toLowerCase();
    if (!c.approved || !c.text.trim() || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const assertions: Assertion[] = approved
    .filter((c) =>
      [
        "skill",
        "project",
        "employment",
        "internship",
        "volunteering",
        "publication",
        "language",
        "learning-outcome",
        "assessment",
      ].includes(c.kind),
    )
    .flatMap((c) =>
      c.mappings
        .filter((m) => m.selected ?? m.confirmed)
        .map((m) => ({
          id: crypto.randomUUID(),
          skillId: m.skillId,
          label: m.label,
          claimId: c.id,
          sourceSystem: "user-document",
          sourceRecordId: doc.id,
          quote: c.quote,
          page: c.page,
          verification: (c.text !== c.quote
            ? "self-reported"
            : m.confirmed || ["exact", "alias"].includes(m.method)
              ? "document-supported"
              : "inferred") as Assertion["verification"],
          selected: true,
          consent: true,
        })),
    );
  const courses: Course[] = academic
    ? [
        {
          id: crypto.randomUUID(),
          ...academic,
          sourceSystem: "user-document",
          sourceRecordId: doc.id,
          verification: "document-supported",
          outcomes: approved
            .filter((c) => c.kind === "learning-outcome")
            .map((c) => ({
              id: c.id,
              text: c.text,
              quote: c.quote,
              skillIds: c.mappings
                .filter((m) => m.selected ?? m.confirmed)
                .map((m) => m.skillId),
            })),
          assessments: approved
            .filter((c) => c.kind === "assessment")
            .map((c) => ({
              title: c.text,
              evidence: c.quote,
              skillIds: c.mappings
                .filter((m) => m.selected ?? m.confirmed)
                .map((m) => m.skillId),
            })),
        },
      ]
    : [];
  // A reviewed upload remains document-supported, never institution verified.
  return {
    ...person,
    fictional: false,
    claims: [...person.claims, ...approved],
    interests: [
      ...new Set([
        ...person.interests,
        ...approved
          .filter((c) => c.kind === "interest")
          .flatMap((c) => c.text.split(/[,;]/))
          .map((x) => x.trim().slice(0, 100))
          .filter(Boolean),
      ]),
    ].slice(0, 30),
    languages: [
      ...new Set([
        ...person.languages,
        ...approved
          .filter((c) => c.kind === "language")
          .map((c) => c.text.slice(0, 100)),
      ]),
    ].slice(0, 30),
    assertions: [...person.assertions, ...assertions],
    courses: [...person.courses, ...courses],
    imports: [
      ...(person.imports || []),
      {
        id: doc.id,
        name: doc.name,
        importedAt: new Date().toISOString(),
        methods: [...new Set((doc.pages || []).map((p) => p.method))],
        claimCount: approved.length,
      },
    ],
  };
}

/** AI may add candidates; it must not replace prior local extraction or user edits. */
export function mergeCandidateClaims(
  existing: Claim[],
  candidates: Claim[],
): Claim[] {
  const merged = existing.map((c) => ({ ...c, mappings: [...c.mappings] }));
  for (const candidate of candidates) {
    const found = merged.find(
      (c) => c.quote === candidate.quote && c.page === candidate.page,
    );
    if (found) {
      const ids = new Set(found.mappings.map((m) => m.skillId));
      found.mappings.push(
        ...candidate.mappings
          .filter((m) => !ids.has(m.skillId))
          .map((m) => ({ ...m, confirmed: false, selected: true })),
      );
    } else
      merged.push({
        ...candidate,
        id: crypto.randomUUID(),
        approved: true,
        mappings: candidate.mappings.map((m) => ({
          ...m,
          confirmed: false,
          selected: true,
        })),
      });
  }
  return merged;
}
