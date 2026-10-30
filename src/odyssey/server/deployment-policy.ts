/** Non-secret owner attestation, scoped to the existing production project.
 * Source: owner Singapore Benefits dashboard confirmation on 2026-10-30.
 * Flash/Max/OCR/embedding/rerank have 1M free tokens each; Free Quota Only enabled through 29 Jan 2027.
 * This records the confirmation; it does not independently query/change the vendor switch.
 * Explicit environment values (including false/disabled/zero) always override defaults.
 */
export function deploymentPolicy(env: Record<string, string | undefined>) {
  // Conservative cutoff: start of 29 January in Singapore (UTC+8).
  if (Date.now() >= Date.parse("2027-01-28T16:00:00Z")) return env;
  const production =
    env.VERCEL === "1" &&
    env.VERCEL_ENV === "production" &&
    (env.VERCEL_PROJECT_ID === "prj_7RnAY2LwbsfkZetzVK93UkLq2gLQ" ||
      env.VERCEL_PROJECT_PRODUCTION_URL === "syrkaroadmap.vercel.app");
  if (!production) return env;
  return {
    AI_PROVIDER: "qwen-free-quota",
    QWEN_DAILY_TOKEN_LIMIT: "100000",
    QWEN_FREE_QUOTA_ONLY_VERIFIED: "true",
    QWEN_FREE_QUOTA_VERIFICATION_REFERENCE:
      "owner-confirmation-2026-10-30-existing-roadmaps-production",
    QWEN_FREE_QUOTA_VERIFIED_UNTIL: "2027-01-28T16:00:00Z",
    QWEN_ALLOW_ANONYMOUS_FREE_ONLY: "true",
    ...env,
  };
}
