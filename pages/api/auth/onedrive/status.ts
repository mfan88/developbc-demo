import type { NextApiRequest, NextApiResponse } from "next";
import { getOneDriveRedirectUri, getRegisteredRedirectUris, getUploadAccessRedirectUri } from "@/lib/server/msalConfig";
import {
  clearOneDriveConnection,
  getOneDriveConnectionStatus,
} from "@/lib/server/onedriveAuth";
import { getTokenStorageDescription, getBlobAuthMode, usesBlobTokenStore } from "@/lib/server/onedriveTokenStore";
import { clearUploadAccessCookieHeader } from "@/lib/server/uploadAccess";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method === "GET") {
    const status = await getOneDriveConnectionStatus();
    return res.status(200).json({
      ...status,
      redirectUri: getOneDriveRedirectUri(req),
      uploadAccessRedirectUri: getUploadAccessRedirectUri(req),
      redirectUris: getRegisteredRedirectUris(),
      tokenStorage: getTokenStorageDescription(),
      blobConfigured: usesBlobTokenStore(),
      blobAuth: getBlobAuthMode(),
    });
  }

  if (req.method === "DELETE") {
    await clearOneDriveConnection();
    res.setHeader("Set-Cookie", clearUploadAccessCookieHeader());
    return res.status(200).json({ connected: false });
  }

  res.setHeader("Allow", "GET, DELETE");
  return res.status(405).json({ error: "Method not allowed" });
}
