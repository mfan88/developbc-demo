import fs from "node:fs";
import formidable from "formidable";
import type { NextApiRequest, NextApiResponse } from "next";
import {
  uploadSmallFileToOneDrive,
  MAX_SIMPLE_UPLOAD_BYTES,
} from "@/lib/graphUpload";
import { getOneDriveAccessToken } from "@/lib/server/onedriveAuth";
import { assertUploadPortalAccess } from "@/lib/server/uploadAccess";

export const config = {
  api: {
    bodyParser: false,
  },
};

function parseUpload(req: NextApiRequest) {
  const form = formidable({
    multiples: false,
    maxFiles: 1,
    maxFileSize: MAX_SIMPLE_UPLOAD_BYTES,
  });

  return new Promise<{ file: formidable.File }>((resolve, reject) => {
    form.parse(req, (error, _fields, files) => {
      if (error) {
        reject(error);
        return;
      }

      const uploaded = files.file;
      const file = Array.isArray(uploaded) ? uploaded[0] : uploaded;
      if (!file) {
        reject(new Error("No file provided"));
        return;
      }

      resolve({ file });
    });
  });
}

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

  let tempFilePath: string | null = null;

  try {
    const { file } = await parseUpload(req);
    tempFilePath = file.filepath;

    const buffer = fs.readFileSync(file.filepath);
    const uploadFile = new File(
      [buffer],
      file.originalFilename ?? "upload.bin",
      {
        type: file.mimetype ?? "application/octet-stream",
      },
    );

    const accessToken = await getOneDriveAccessToken();
    const result = await uploadSmallFileToOneDrive(uploadFile, accessToken);

    return res.status(200).json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed";
    return res.status(500).json({ error: message });
  } finally {
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
  }
}
