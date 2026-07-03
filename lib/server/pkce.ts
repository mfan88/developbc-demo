import crypto from "node:crypto";

export function createPkcePair() {
  const verifier = crypto.randomBytes(32).toString("base64url");
  const challenge = crypto
    .createHash("sha256")
    .update(verifier)
    .digest("base64url");

  return { verifier, challenge };
}

export const PKCE_COOKIE_NAME = "onedrive_pkce";

export function setPkceCookie(res: { setHeader: (name: string, value: string) => void }, verifier: string) {
  res.setHeader(
    "Set-Cookie",
    `${PKCE_COOKIE_NAME}=${encodeURIComponent(verifier)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600`,
  );
}

export function clearPkceCookie(res: { setHeader: (name: string, value: string) => void }) {
  res.setHeader(
    "Set-Cookie",
    `${PKCE_COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`,
  );
}

export function getPkceCookie(req: { headers: { cookie?: string } }) {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return null;

  for (const part of cookieHeader.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === PKCE_COOKIE_NAME) {
      return decodeURIComponent(rest.join("="));
    }
  }

  return null;
}
