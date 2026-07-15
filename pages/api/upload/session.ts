import type { NextApiRequest, NextApiResponse } from "next";
import {
  assertValidUploadSize,
  createOneDriveUploadSession,
  sanitizeUploadFilename,
} from "@/lib/graphUpload";
import { getOneDriveAccessToken } from "@/lib/server/onedriveAuth";
import { assertUploadPortalAccess } from "@/lib/server/uploadAccess";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!(await assertUploadPortalAccess(req, res))) {
    return;
  }

  try {
    const body = req.body as {
      filename?: string;
      fileSize?: number;
    };

    if (typeof body.filename !== "string") {
      return res.status(400).json({ error: "Filename is required" });
    }

    const filename = sanitizeUploadFilename(body.filename);
    assertValidUploadSize(Number(body.fileSize));

    const accessToken = await getOneDriveAccessToken();
    const session = await createOneDriveUploadSession(accessToken, filename);

    return res.status(200).json(session);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not create upload session";
    return res.status(500).json({ error: message });
  }
}
