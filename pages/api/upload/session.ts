import type { NextApiRequest, NextApiResponse } from "next";
import {
  assertValidUploadSize,
  createOneDriveUploadSession,
  sanitizeUploadFilename,
} from "@/lib/graphUpload";
import { getOneDriveAccessToken } from "@/lib/server/onedriveAuth";
import { resolveUploadFolder } from "@/lib/uploadFolders";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const body = req.body as {
      filename?: string;
      folder?: string;
      fileSize?: number;
    };

    const folderKey = body.folder;
    const folder =
      typeof folderKey === "string" ? resolveUploadFolder(folderKey) : null;
    if (!folder) {
      return res.status(400).json({ error: "A valid physio folder is required" });
    }

    if (typeof body.filename !== "string") {
      return res.status(400).json({ error: "Filename is required" });
    }

    const filename = sanitizeUploadFilename(body.filename);
    assertValidUploadSize(Number(body.fileSize));

    const accessToken = await getOneDriveAccessToken();
    const session = await createOneDriveUploadSession(
      accessToken,
      folder,
      filename,
    );

    return res.status(200).json(session);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not create upload session";
    return res.status(500).json({ error: message });
  }
}
