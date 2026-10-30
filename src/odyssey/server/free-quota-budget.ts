import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { Budget } from "./ai-gateway";
const salt = randomBytes(32).toString("hex");
/** Best-effort per-instance limiter. Vendor Free Quota Only remains the hard billing guard. */
export function createFreeQuotaLimiter(now: () => number = Date.now) {
  let day = -1,
    reserved = 0;
  const clients = new Map<string, { requests: number; recent: number[] }>();
  return (client: string, limit: number): Budget => ({
    reserve: async (action, model, tokens) => {
      const time = now(),
        today = Math.floor(time / 86400000);
      if (today !== day) {
        day = today;
        reserved = 0;
        clients.clear();
      }
      if (
        !Number.isSafeInteger(tokens) ||
        tokens <= 0 ||
        tokens > limit ||
        reserved + tokens > limit
      )
        throw new Error(
          "Free AI application quota reached. Your profile is preserved; local tools remain available.",
        );
      const key = createHash("sha256")
        .update(salt + client.slice(0, 200))
        .digest("hex");
      if (!clients.has(key) && clients.size >= 1000)
        throw new Error("Free AI is busy; local tools remain available.");
      const state = clients.get(key) || { requests: 0, recent: [] };
      state.recent = state.recent.filter((t) => t > time - 60000);
      if (state.requests >= 12 || state.recent.length >= 3)
        throw new Error(
          "Free AI rate limit reached. Try later; local tools remain available.",
        );
      state.requests++;
      state.recent.push(time);
      clients.set(key, state);
      reserved += tokens;
      const id = randomUUID();
      console.info("roadmaps-ai-reservation", {
        id,
        action,
        model,
        reservedTokens: tokens,
        scope: "free-only-instance",
      });
      return id;
    },
    record: async (id, input, output, status) => {
      console.info("roadmaps-ai-usage", {
        id,
        inputTokens: input,
        outputTokens: output,
        status,
        scope: "free-only-instance",
      });
    },
  });
}
export const freeQuotaLimiter = createFreeQuotaLimiter();
