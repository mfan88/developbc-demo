import type { NextApiRequest, NextApiResponse } from "next";
import {
  getConnectedOneDriveAccount,
  getUploadAccessLoginUrl,
} from "@/lib/server/onedriveAuth";
import { createPkcePair, authFlowCookieHeader, pkceCookieHeader } from "@/lib/server/pkce";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const connectedAccount = await getConnectedOneDriveAccount();
    const { verifier, challenge } = createPkcePair();
    res.setHeader("Set-Cookie", [
      pkceCookieHeader(verifier),
      authFlowCookieHeader("upload-access"),
    ]);
    const loginUrl = await getUploadAccessLoginUrl(
      challenge,
      req,
      connectedAccount?.username ?? undefined,
    );
    res.redirect(307, loginUrl);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Login failed";
    res.status(500).json({ error: message });
  }
}
