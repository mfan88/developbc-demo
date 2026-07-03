import {
  type OneDriveUploadResult,
  type OneDriveUploadSession,
} from "@/lib/graphUpload";
import {
  MAX_SIMPLE_UPLOAD_BYTES,
  UPLOAD_CHUNK_BYTES,
} from "@/lib/uploadLimits";

type UploadSessionResponse = OneDriveUploadSession;

async function uploadViaSession(
  file: File,
  uploadUrl: string,
  onProgress?: (percent: number) => void,
): Promise<OneDriveUploadResult> {
  let start = 0;

  while (start < file.size) {
    const end = Math.min(start + UPLOAD_CHUNK_BYTES, file.size) - 1;
    const chunk = file.slice(start, end + 1);

    const response = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Length": String(chunk.size),
        "Content-Range": `bytes ${start}-${end}/${file.size}`,
      },
      body: chunk,
    });

    if (response.status === 202) {
      start = end + 1;
      onProgress?.(Math.round((start / file.size) * 100));
      continue;
    }

    if (response.status === 201 || response.status === 200) {
      onProgress?.(100);
      return (await response.json()) as OneDriveUploadResult;
    }

    const details = await response.text();
    throw new Error(
      `Upload failed (${response.status}): ${details || response.statusText}`,
    );
  }

  throw new Error("Upload finished without receiving a file response.");
}

async function uploadViaApiRoute(
  file: File,
  folder: string,
): Promise<OneDriveUploadResult> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("folder", folder);

  const response = await fetch("/api/upload", {
    method: "POST",
    body: formData,
  });

  const payload = (await response.json()) as
    | OneDriveUploadResult
    | { error?: string };

  if (!response.ok) {
    throw new Error(
      "error" in payload && payload.error ? payload.error : "Upload failed",
    );
  }

  return payload as OneDriveUploadResult;
}

export async function uploadFileToOneDrive(
  file: File,
  folder: string,
  onProgress?: (message: string) => void,
): Promise<OneDriveUploadResult> {
  if (file.size <= MAX_SIMPLE_UPLOAD_BYTES) {
    onProgress?.("Uploading...");
    return uploadViaApiRoute(file, folder);
  }

  onProgress?.("Starting large file upload...");
  const sessionResponse = await fetch("/api/upload/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      filename: file.name,
      folder,
      fileSize: file.size,
    }),
  });

  const sessionPayload = (await sessionResponse.json()) as
    | UploadSessionResponse
    | { error?: string };

  if (!sessionResponse.ok) {
    throw new Error(
      "error" in sessionPayload && sessionPayload.error
        ? sessionPayload.error
        : "Could not start upload session",
    );
  }

  const session = sessionPayload as UploadSessionResponse;
  return uploadViaSession(file, session.uploadUrl, (percent) => {
    onProgress?.(`Uploading... ${percent}%`);
  });
}
