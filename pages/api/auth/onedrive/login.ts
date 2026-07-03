import type { NextApiRequest, NextApiResponse } from "next";
import { getOneDriveLoginUrl } from "@/lib/server/onedriveAuth";
import { createPkcePair, setPkceCookie } from "@/lib/server/pkce";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const { verifier, challenge } = createPkcePair();
    setPkceCookie(res, verifier);
    const loginUrl = await getOneDriveLoginUrl(challenge);
    res.redirect(307, loginUrl);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Login failed";
    res.status(500).json({ error: message });
  }
}
