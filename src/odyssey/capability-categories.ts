import type { Assertion } from "./types";
export const capabilityCategories = [
  "Academic",
  "Technical",
  "Analytical",
  "Communication",
  "Leadership",
  "Research",
  "Industry-specific",
] as const;
/** Editorial navigation groups only; these are not source ESCO hierarchy assertions. */
export function capabilityCategory(
  a: Assertion,
): (typeof capabilityCategories)[number] {
  if (/course|campus|academic/.test(a.sourceSystem)) return "Academic";
  const label = a.label.toLowerCase();
  if (/research|literature|publication|experiment/.test(label))
    return "Research";
  if (/communicat|writ|present|language|negotia/.test(label))
    return "Communication";
  if (/lead|manag|strateg|supervis|coordinat/.test(label)) return "Leadership";
  if (/analy|statistic|economic|reason|evaluat|mathematic/.test(label))
    return "Analytical";
  if (
    /python|sql|program|software|computer|database|cyber|machine|algorithm|engineer/.test(
      label,
    )
  )
    return "Technical";
  return "Industry-specific";
}
