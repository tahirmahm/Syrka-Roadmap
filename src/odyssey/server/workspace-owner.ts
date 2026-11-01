/** An authenticated cookie is insufficient to identify the intent of a delayed client request. */
export function expectedWorkspaceOwner(
  headers: Headers,
  authenticatedOwner: string,
  required = true,
) {
  const expected = headers.get("x-roadmaps-owner");
  if (!expected && !required) return true;
  return !!expected && expected === authenticatedOwner;
}
