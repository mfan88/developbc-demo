import fs from "node:fs";
import formidable from "formidable";
import type { NextApiRequest, NextApiResponse } from "next";
import { uploadToOneDrive } from "@/lib/graphUpload";
import { getOneDriveAccessToken } from "@/lib/server/onedriveAuth";
import { resolveUploadFolder } from "@/lib/uploadFolders";

export const config = {
  api: {
    bodyParser: false,
  },
};

function parseUpload(req: NextApiRequest) {
  const form = formidable({
    multiples: false,
    maxFiles: 1,
    maxFileSize: 25 * 1024 * 1024,
  });

  return new Promise<{ file: formidable.File; folder: string }>((resolve, reject) => {
    form.parse(req, (error, fields, files) => {
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

      const folderField = fields.folder;
      const folderKey = Array.isArray(folderField)
        ? folderField[0]
        : folderField;
      const folder =
        typeof folderKey === "string" ? resolveUploadFolder(folderKey) : null;
      if (!folder) {
        reject(new Error("A valid physio folder is required"));
        return;
      }

      resolve({ file, folder });
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

  let tempFilePath: string | null = null;

  try {
    const { file, folder } = await parseUpload(req);
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
    const result = await uploadToOneDrive(uploadFile, accessToken, folder);

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
