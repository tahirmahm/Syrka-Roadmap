/** One bounded synthetic probe in this project's production deployment BUILD.
 * Never a runtime-availability claim; no CVs, raw errors or secrets are published.
 */
import { readFile, mkdir, writeFile, rm } from "node:fs/promises";
import { aiConfig } from "../src/odyssey/server/ai-gateway";
import { diagnoseQwen } from "../src/odyssey/server/qwen-diagnostics";
import { investigateFreeModels } from "../src/odyssey/server/qwen-enhancements";
import { deploymentPolicy } from "../src/odyssey/server/deployment-policy";
async function main() {
  const file = "public/build-status/qwen.json";
  const policy = deploymentPolicy(process.env);
  if (
    process.env.VERCEL !== "1" ||
    process.env.VERCEL_ENV !== "production" ||
    policy.QWEN_FREE_QUOTA_VERIFICATION_REFERENCE !==
      "owner-confirmation-2026-10-30-existing-roadmaps-production"
  ) {
    await rm(file, { force: true });
    console.log(
      "Qwen production-build probe skipped outside the authorized deployment scope.",
    );
    return;
  }
  const enabled =
    policy.QWEN_VERIFY_ON_DEPLOY !== "false" &&
    aiConfig(policy)?.provider === "qwen-free-quota";
  const result = enabled
    ? await diagnoseQwen(policy, "json")
    : { stage: "disabled-or-configuration-incomplete", requestSent: false };
  const enhancements =
    "structuredOutputValid" in result &&
    result.structuredOutputValid &&
    "modelMatchesRequest" in result &&
    result.modelMatchesRequest === true
      ? await investigateFreeModels(
          policy,
          (await readFile("src/data/fixtures/qwen-ocr.png")).toString("base64"),
        )
      : { stage: "skipped-until-flash-succeeds", requestSent: false };
  const safe = {
    enhancements,
    executionEnvironment: "vercel-build",
    commit: process.env.VERCEL_GIT_COMMIT_SHA || null,
    testedAt: new Date().toISOString(),
    stage: result.stage,
    requestSent: result.requestSent,
    status: "status" in result ? result.status : null,
    structuredOutputValid:
      "structuredOutputValid" in result ? result.structuredOutputValid : false,
    respondedModel: "respondedModel" in result ? result.respondedModel : null,
    modelMatchesRequest:
      "modelMatchesRequest" in result ? result.modelMatchesRequest : null,
    notice:
      "Build-time synthetic probe only. Runtime and full CV workflow need separate verification.",
  };
  await mkdir("public/build-status", { recursive: true });
  await writeFile(file, JSON.stringify(safe));
  console.log("Qwen production-build result", safe);
}
main().catch(() => {
  console.error(
    "Qwen build probe failed; deterministic application build continues. No raw provider output printed.",
  );
});
