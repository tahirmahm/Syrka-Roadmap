import { QWEN_API_URL, qwenReadiness } from "./ai-gateway";
import { deploymentPolicy } from "./deployment-policy";
export async function diagnoseQwen(
  env: Record<string, string | undefined>,
  mode: "configuration" | "models" | "json",
  transport: typeof fetch = fetch,
) {
  env = deploymentPolicy(env);
  const configuration = qwenReadiness(env);
  if (
    mode === "configuration" ||
    !configuration.baseURLMatches ||
    !configuration.keyPresent ||
    !configuration.freeQuotaVerificationRecorded
  )
    return { stage: "configuration", configuration, requestSent: false };
  try {
    const response = await transport(
      QWEN_API_URL + (mode === "models" ? "/models" : "/chat/completions"),
      {
        method: mode === "models" ? "GET" : "POST",
        redirect: "error",
        signal: AbortSignal.timeout(15000),
        headers: {
          Authorization: "Bearer " + env.QWEN_API_KEY,
          "Content-Type": "application/json",
        },
        ...(mode === "models"
          ? {}
          : {
              body: JSON.stringify({
                model: env.QWEN_MODEL || "qwen3.8-flash",
                max_tokens: 128,
                temperature: 0,
                response_format: { type: "json_object" },
                messages: [
                  { role: "user", content: 'Return only {"ok":true} as JSON.' },
                ],
              }),
            }),
      },
    );
    // Read bounded structured fields only. Never return raw errors/messages or headers.
    const raw = await response.text();
    if (raw.length > 100000)
      return {
        stage: "provider-response",
        status: response.status,
        requestSent: true,
        result: "response-too-large",
      };
    let data: Record<string, unknown> = {};
    try {
      data = JSON.parse(raw);
    } catch {}
    if (!response.ok) {
      const error = data.error as { code?: unknown } | undefined;
      const knownCodes = new Set([
        "InvalidApiKey",
        "invalid_api_key",
        "AccessDenied",
        "ModelNotFound",
        "model_not_found",
        "insufficient_quota",
        "Unauthorized",
        "Forbidden",
        "PermissionDenied",
        "ModelNotSupported",
      ]);
      const code =
        typeof error?.code === "string" && knownCodes.has(error.code)
          ? error.code
          : "unclassified";
      return {
        stage: "provider-http",
        status: response.status,
        code,
        requestSent: true,
        interpretation:
          response.status === 401
            ? "authentication-rejected"
            : response.status === 403
              ? "gateway-or-entitlement-rejection; status alone is insufficient"
              : response.status === 404
                ? "route-or-model-not-found"
                : response.status === 429
                  ? "rate-or-plan-quota"
                  : "provider-rejection",
      };
    }
    if (mode === "models") {
      const list = data.data as { id?: unknown }[] | undefined;
      return {
        stage: "provider-response",
        status: response.status,
        requestSent: true,
        models: Array.isArray(list)
          ? list
              .filter(
                (m) =>
                  typeof m.id === "string" &&
                  /^[a-zA-Z0-9._:/-]{1,120}$/.test(m.id),
              )
              .slice(0, 100)
              .map((m) => m.id)
          : [],
        notice:
          "Listed models are not independent proof of free-quota coverage.",
      };
    }
    let valid = false;
    try {
      const choices = data.choices as { message: { content: string } }[];
      const parsed = JSON.parse(choices[0].message.content);
      valid = parsed.ok === true && Object.keys(parsed).length === 1;
    } catch {}
    const requestedModel = env.QWEN_MODEL || "qwen3.8-flash";
    const respondedModel =
      typeof data.model === "string" &&
      /^qwen3\.8-(?:flash|max)(?:[-.][A-Za-z0-9_.-]{1,60})?$/.test(data.model)
        ? data.model
        : null;
    return {
      stage: "provider-response",
      status: response.status,
      requestSent: true,
      structuredOutputValid: valid,
      requestedModel,
      respondedModel,
      modelMatchesRequest:
        respondedModel === null
          ? null
          : respondedModel === requestedModel ||
            respondedModel.startsWith(requestedModel + "-"),
    };
  } catch {
    return {
      stage: "transport",
      requestSent: "unknown",
      configuration,
      notice:
        "No provider HTTP response was received. Check this server's egress, DNS and TLS; this does not establish invalid credentials.",
    };
  }
}
