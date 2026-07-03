const REDIRECT_PATH = "/redirect";

export function getRedirectUri() {
  if (typeof window === "undefined") {
    return "http://localhost:3000/redirect";
  }
  return `${window.location.origin}${REDIRECT_PATH}`;
}

export function clearStaleMsalUrlParams() {
  if (typeof window === "undefined") return;
  if (window.location.pathname === REDIRECT_PATH) return;

  const url = window.location.href;
  const hasAuthParams =
    url.includes("state=") &&
    (url.includes("code=") || url.includes("error="));

  if (!hasAuthParams) return;

  window.history.replaceState(
    null,
    "",
    `${window.location.origin}${window.location.pathname}`,
  );
}
