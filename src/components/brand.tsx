export function Brand({ wordmark = false }: { wordmark?: boolean }) {
  const base = process.env.NEXT_PUBLIC_BASE_PATH || "";
  return (
    <span
      role="img"
      aria-label={wordmark ? "Syrka" : "Syrka symbol"}
      className={`brand-mask ${wordmark ? "brand-wordmark" : "brand-symbol"}`}
      style={{
        maskImage: `url(${base}/brand/${wordmark ? "wordmark" : "symbol"}.jpg)`,
      }}
    />
  );
}
