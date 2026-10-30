import { headers, cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { AIConfig, Budget } from "./ai-gateway";
import { deploymentPolicy } from "./deployment-policy";
import { freeQuotaLimiter } from "./free-quota-budget";
export async function authenticatedBudget(config?: AIConfig): Promise<Budget> {
  const policy = deploymentPolicy(process.env);
  const guest = async () => {
    if (
      config?.billingMode !== "free-quota" ||
      policy.QWEN_ALLOW_ANONYMOUS_FREE_ONLY !== "true"
    )
      throw new Error(
        "Sign in or configure the verified-free guest adapter before external AI.",
      );
    const h = await headers();
    return freeQuotaLimiter(
      h.get("x-real-ip") || h.get("x-forwarded-for") || "anonymous",
      config.dailyTokenLimit || 0,
    );
  };
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
    key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return guest();
  const jar = await cookies();
  const db = createServerClient(url, key, {
    cookies: {
      getAll: () => jar.getAll(),
      setAll: (values) => {
        for (const v of values) jar.set(v.name, v.value, v.options);
      },
    },
  });
  const {
    data: { user },
    error,
  } = await db.auth.getUser();
  if (error || !user) return guest();
  const tokenQuota = config?.billingMode === "free-quota";
  return {
    reserve: async (action, model, cost) => {
      const r = await db.rpc(
        tokenQuota
          ? "reserve_roadmaps_qwen_tokens"
          : "reserve_roadmaps_ai_budget",
        {
          p_action: action,
          p_model: model,
          [tokenQuota ? "p_reserved_tokens" : "p_max_cost_micro_usd"]: cost,
        },
      );
      if (r.error || !r.data)
        throw new Error("AI request quota or budget is unavailable.");
      return r.data as string;
    },
    record: async (id, input, output, status) => {
      const r = await db.rpc(
        tokenQuota ? "record_roadmaps_qwen_usage" : "record_roadmaps_ai_usage",
        {
          p_id: id,
          p_input_tokens: input,
          p_output_tokens: output,
          p_status: status,
        },
      );
      if (r.error) throw new Error("AI usage logging failed.");
    },
  };
}
