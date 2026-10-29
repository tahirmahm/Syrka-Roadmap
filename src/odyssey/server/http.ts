export class PayloadTooLarge extends Error {
  constructor() {
    super("Request exceeds the processing limit.");
  }
}
export async function boundedJSON(
  request: Request,
  maxBytes: number,
): Promise<unknown> {
  const length = Number(request.headers.get("content-length"));
  if (Number.isFinite(length) && length > maxBytes) throw new PayloadTooLarge();
  const reader = request.body?.getReader();
  if (!reader) throw new Error("Missing request body");
  const parts: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        throw new PayloadTooLarge();
      }
      parts.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const all = new Uint8Array(size);
  let at = 0;
  for (const p of parts) {
    all.set(p, at);
    at += p.byteLength;
  }
  return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(all));
}
