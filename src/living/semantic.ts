import { z } from "zod";
import {
  aiConfig,
  QWEN_API_URL,
  type Budget,
} from "../odyssey/server/ai-gateway";
const vectors = z.object({
  data: z
    .array(
      z.object({
        index: z.number().int().nonnegative(),
        embedding: z.array(z.number().finite()).min(1).max(8192),
      }),
    )
    .min(1)
    .max(21),
  usage: z.object({ total_tokens: z.number().int().nonnegative() }).optional(),
});
export function cosine(a: number[], b: number[]) {
  if (a.length !== b.length || !a.length) return 0;
  const dot = a.reduce((n, x, i) => n + x * b[i], 0),
    den = Math.hypot(...a) * Math.hypot(...b);
  return den ? dot / den : 0;
}
/** Optional semantic retrieval of public catalogue labels only. No embedding index is presented as authority. */
export async function semanticCandidates(
  query: string,
  candidates: { id: string; label: string }[],
  budget: Budget,
  env: Record<string, string | undefined> = process.env,
  transport: typeof fetch = fetch,
) {
  if (
    env.QWEN_EMBEDDING_FREE_VERIFIED !== "true" ||
    env.QWEN_EMBEDDING_MODEL !== "text-embedding-v4"
  )
    return { status: "disabled" as const, results: [] };
  const config = aiConfig(env);
  if (
    !config ||
    config.provider !== "qwen-free-quota" ||
    config.baseURL !== QWEN_API_URL
  )
    return { status: "disabled" as const, results: [] };
  if (
    query.length > 700 ||
    candidates.length > 20 ||
    candidates.some((c) => c.label.length > 300)
  )
    throw new Error("Semantic retrieval exceeds its bounded context");
  const input = [query, ...candidates.map((c) => c.label)],
    reservation = new TextEncoder().encode(input.join(" ")).byteLength + 1000;
  if (reservation > (config.dailyTokenLimit || 0))
    throw new Error("Embedding budget unavailable");
  const receipt = await budget.reserve(
    "living-embedding",
    "text-embedding-v4",
    reservation,
  );
  try {
    const r = await transport(QWEN_API_URL + "/embeddings", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + config.apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model: "text-embedding-v4", input }),
      signal: AbortSignal.timeout(Math.min(config.timeoutMs, 12000)),
      redirect: "error",
    });
    if (!r.ok) throw new Error("Semantic provider rejected the request");
    const parsed = vectors.parse(await r.json());
    const sorted = [...parsed.data].sort((a, b) => a.index - b.index);
    if (
      sorted.length !== input.length ||
      sorted.some(
        (v, i) =>
          v.index !== i || v.embedding.length !== sorted[0].embedding.length,
      )
    )
      throw new Error("Invalid embedding dimensions or indices");
    const results = candidates
      .map((c, i) => ({
        ...c,
        similarity: cosine(sorted[0].embedding, sorted[i + 1].embedding),
      }))
      .sort((a, b) => b.similarity - a.similarity);
    await budget.record(
      receipt,
      parsed.usage?.total_tokens || reservation,
      0,
      "completed",
    );
    return { status: "semantic" as const, results };
  } catch (e) {
    await budget.record(receipt, 0, 0, "failed");
    throw e;
  }
}
/** Native rerank format/region entitlement could not be verified. Never guess a chat-compatible endpoint. */
export const rerankReadiness = {
  model: "qwen3-rerank",
  enabled: false,
  reason:
    "Official native API format, regional availability and model-specific free-only entitlement require live verification.",
} as const;
