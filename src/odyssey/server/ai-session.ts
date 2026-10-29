import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { AIConfig, Budget } from "./ai-gateway";
export async function authenticatedBudget(config?: AIConfig): Promise<Budget> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
    key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key)
    throw new Error(
      "External AI requires a configured Roadmaps account and durable budget store.",
    );
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
  if (error || !user) throw new Error("Sign in before using external AI.");
  const tokenPlan = config?.billingMode === "token-plan";
  return {
    reserve: async (action, model, cost) => {
      const r = await db.rpc(
        tokenPlan
          ? "reserve_roadmaps_qwen_tokens"
          : "reserve_roadmaps_ai_budget",
        {
          p_action: action,
          p_model: model,
          [tokenPlan ? "p_reserved_tokens" : "p_max_cost_micro_usd"]: cost,
        },
      );
      if (r.error || !r.data)
        throw new Error("AI request quota or budget is unavailable.");
      return r.data as string;
    },
    record: async (id, input, output, status) => {
      const r = await db.rpc(
        tokenPlan ? "record_roadmaps_qwen_usage" : "record_roadmaps_ai_usage",
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
