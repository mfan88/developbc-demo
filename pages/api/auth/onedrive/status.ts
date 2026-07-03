import type { NextApiRequest, NextApiResponse } from "next";
import { getOneDriveRedirectUri } from "@/lib/server/msalConfig";
import {
  clearOneDriveConnection,
  getOneDriveConnectionStatus,
} from "@/lib/server/onedriveAuth";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method === "GET") {
    const status = await getOneDriveConnectionStatus();
    return res.status(200).json({
      ...status,
      redirectUri: getOneDriveRedirectUri(),
    });
  }

  if (req.method === "DELETE") {
    await clearOneDriveConnection();
    return res.status(200).json({ connected: false });
  }

  res.setHeader("Allow", "GET, DELETE");
  return res.status(405).json({ error: "Method not allowed" });
}
