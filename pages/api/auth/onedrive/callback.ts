import type { NextApiRequest, NextApiResponse } from "next";
import { completeOneDriveLogin } from "@/lib/server/onedriveAuth";
import { clearPkceCookie, getPkceCookie } from "@/lib/server/pkce";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const code = typeof req.query.code === "string" ? req.query.code : null;
  const error = typeof req.query.error === "string" ? req.query.error : null;
  const errorDescription =
    typeof req.query.error_description === "string"
      ? req.query.error_description
      : null;

  if (error) {
    clearPkceCookie(res);
    const details = errorDescription ?? error;
    res.redirect(307, `/setup?error=${encodeURIComponent(details)}`);
    return;
  }

  if (!code) {
    clearPkceCookie(res);
    res.redirect(307, "/setup?error=missing_code");
    return;
  }

  const codeVerifier = getPkceCookie(req);
  if (!codeVerifier) {
    res.redirect(307, "/setup?error=missing_pkce_verifier");
    return;
  }

  try {
    await completeOneDriveLogin(code, codeVerifier, req);
    clearPkceCookie(res);
    res.redirect(307, "/setup?connected=1");
  } catch (err) {
    clearPkceCookie(res);
    const message = err instanceof Error ? err.message : "callback_failed";
    res.redirect(307, `/setup?error=${encodeURIComponent(message)}`);
  }
}
