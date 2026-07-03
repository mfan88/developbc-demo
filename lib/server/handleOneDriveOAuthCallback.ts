import type { NextApiRequest, NextApiResponse } from "next";
import {
  getConnectedOneDriveAccount,
  completeOneDriveLogin,
  verifyUploadAccessIdentity,
  oneDriveAccountsMatch,
} from "@/lib/server/onedriveAuth";
import {
  clearAuthFlowCookieHeader,
  clearPkceCookieHeader,
  getAuthFlowCookie,
  getPkceCookie,
} from "@/lib/server/pkce";
import { clearUploadAccessCookieHeader } from "@/lib/server/uploadAccess";

function clearAuthCookies() {
  return [clearPkceCookieHeader(), clearAuthFlowCookieHeader()];
}

export async function handleOneDriveOAuthCallback(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const flow = getAuthFlowCookie(req) ?? "setup";
  const code = typeof req.query.code === "string" ? req.query.code : null;
  const error = typeof req.query.error === "string" ? req.query.error : null;
  const errorDescription =
    typeof req.query.error_description === "string"
      ? req.query.error_description
      : null;

  if (error) {
    res.setHeader("Set-Cookie", clearAuthCookies());
    const details = errorDescription ?? error;
    if (flow === "upload-access") {
      res.redirect(307, `/upload-access-denied?error=${encodeURIComponent(details)}`);
      return;
    }
    res.redirect(307, `/setup?error=${encodeURIComponent(details)}`);
    return;
  }

  if (!code) {
    res.setHeader("Set-Cookie", clearAuthCookies());
    if (flow === "upload-access") {
      res.redirect(307, "/upload-access-denied?error=missing_code");
      return;
    }
    res.redirect(307, "/setup?error=missing_code");
    return;
  }

  const codeVerifier = getPkceCookie(req);
  if (!codeVerifier) {
    res.setHeader("Set-Cookie", clearAuthCookies());
    if (flow === "upload-access") {
      res.redirect(307, "/upload-access-denied?error=missing_pkce_verifier");
      return;
    }
    res.redirect(307, "/setup?error=missing_pkce_verifier");
    return;
  }

  if (flow === "upload-access") {
    try {
      const connectedAccount = await getConnectedOneDriveAccount();
      if (!connectedAccount?.username) {
        res.setHeader("Set-Cookie", clearAuthCookies());
        res.redirect(307, "/upload-access-denied?error=not_configured");
        return;
      }

      const signedInAccount = await verifyUploadAccessIdentity(
        code,
        codeVerifier,
        req,
      );

      if (!signedInAccount?.username) {
        res.setHeader("Set-Cookie", [
          ...clearAuthCookies(),
          clearUploadAccessCookieHeader(),
        ]);
        res.redirect(307, "/upload-access-denied?error=missing_account");
        return;
      }

      if (!oneDriveAccountsMatch(signedInAccount, connectedAccount)) {
        res.setHeader("Set-Cookie", [
          ...clearAuthCookies(),
          clearUploadAccessCookieHeader(),
        ]);
        const params = new URLSearchParams({
          error: "wrong_account",
          signedIn: signedInAccount.username ?? "unknown",
          expected: connectedAccount.username ?? "unknown",
        });
        res.redirect(307, `/upload-access-denied?${params.toString()}`);
        return;
      }

      res.setHeader("Set-Cookie", [
        ...clearAuthCookies(),
        clearUploadAccessCookieHeader(),
      ]);
      res.redirect(307, "/setup");
    } catch (err) {
      res.setHeader("Set-Cookie", clearAuthCookies());
      const message = err instanceof Error ? err.message : "callback_failed";
      res.redirect(307, `/upload-access-denied?error=${encodeURIComponent(message)}`);
    }
    return;
  }

  try {
    await completeOneDriveLogin(code, codeVerifier, req);
    res.setHeader("Set-Cookie", clearAuthCookies());
    res.redirect(307, "/setup?connected=1");
  } catch (err) {
    res.setHeader("Set-Cookie", clearAuthCookies());
    const message = err instanceof Error ? err.message : "callback_failed";
    res.redirect(307, `/setup?error=${encodeURIComponent(message)}`);
  }
}
