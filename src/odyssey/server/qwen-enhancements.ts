import { QWEN_API_URL, qwenReadiness } from "./ai-gateway";
import { deploymentPolicy } from "./deployment-policy";
/** Synthetic compatibility investigation only. Does not index occupations or process real CVs. */
export async function investigateFreeModels(
  env: Record<string, string | undefined>,
  imageBase64: string,
  transport: typeof fetch = fetch,
) {
  const config = deploymentPolicy(env),
    ready = qwenReadiness(config);
  if (
    !ready.keyPresent ||
    !ready.baseURLMatches ||
    !ready.freeQuotaVerificationRecorded
  )
    return { stage: "configuration", requestSent: false };
  if (imageBase64.length > 100000)
    throw new Error("OCR probe fixture exceeds its limit.");
  const probe = async (path: string, body: unknown) => {
    const r = await transport(QWEN_API_URL + path, {
      method: "POST",
      redirect: "error",
      headers: {
        Authorization: "Bearer " + config.QWEN_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    });
    if (!r.ok) return { status: r.status, data: null };
    return { status: r.status, data: await r.json() };
  };
  let embedding: {
    status: number | null;
    compatible: boolean;
    dimensions?: number;
  } = { status: null, compatible: false };
  let ocr: {
    status: number | null;
    compatible: boolean;
    recognizedFixture?: boolean;
  } = { status: null, compatible: false };
  try {
    const r = await probe("/embeddings", {
      model: "text-embedding-v4",
      input: "SQL data analysis",
    });
    const v = r.data?.data?.[0]?.embedding;
    embedding = {
      status: r.status,
      compatible:
        Array.isArray(v) &&
        v.length > 0 &&
        v.length <= 8192 &&
        v.every((n: unknown) => typeof n === "number" && Number.isFinite(n)),
      ...(Array.isArray(v) ? { dimensions: v.length } : {}),
    };
  } catch {}
  try {
    const r = await probe("/chat/completions", {
      model: "qwen-vl-ocr",
      max_tokens: 128,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: { url: "data:image/png;base64," + imageBase64 },
            },
            {
              type: "text",
              text: "Extract the visible text from this fictional test fixture. Return only the extracted text.",
            },
          ],
        },
      ],
    });
    const text = r.data?.choices?.[0]?.message?.content;
    ocr = {
      status: r.status,
      compatible: typeof text === "string",
      recognizedFixture:
        typeof text === "string" && /SQL/i.test(text) && /Python/i.test(text),
    };
  } catch {}
  return {
    stage: "investigation",
    requestSent: true,
    embedding,
    ocr,
    notice:
      "Synthetic compatibility tests only; no live CV OCR or occupational embedding index is claimed.",
  };
}
