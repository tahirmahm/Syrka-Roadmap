/** Run from an authorized operator machine. Credentials stay in request headers. */
async function main() {
  if (!process.env.QWEN_DIAGNOSTICS_TOKEN)
    throw new Error(
      "Set the server-configured QWEN_DIAGNOSTICS_TOKEN securely before probing.",
    );
  const mode = process.argv.includes("--configuration")
    ? "configuration"
    : process.argv.includes("--json")
      ? "json"
      : "models";
  const r = await fetch(
    "https://syrkaroadmap.vercel.app/api/diagnostics/qwen?mode=" + mode,
    {
      method: "POST",
      headers: { "x-roadmaps-diagnostics": process.env.QWEN_DIAGNOSTICS_TOKEN },
      redirect: "error",
      signal: AbortSignal.timeout(25000),
    },
  );
  if (!r.ok) {
    console.error(
      `Vercel diagnostic returned HTTP ${r.status}; no response body printed.`,
    );
    process.exitCode = 1;
    return;
  }
  const result = await r.json();
  // Only the protected diagnostic's safe allowlisted result fields are emitted.
  const fields = [
    "executionEnvironment",
    "stage",
    "configuration",
    "requestSent",
    "status",
    "code",
    "interpretation",
    "models",
    "notice",
    "structuredOutputValid",
    "requestedModel",
    "respondedModel",
    "modelMatchesRequest",
    "result",
  ];
  console.log(
    JSON.stringify(
      Object.fromEntries(
        fields.filter((k) => k in result).map((k) => [k, result[k]]),
      ),
      null,
      2,
    ),
  );
}
main().catch(() => {
  console.error(
    "Could not reach the protected Vercel diagnostic. Check network policy and deployment configuration.",
  );
  process.exitCode = 1;
});
