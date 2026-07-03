import {
  type OneDriveUploadResult,
  type OneDriveUploadSession,
} from "@/lib/graphUpload";
import {
  MAX_SIMPLE_UPLOAD_BYTES,
  UPLOAD_CHUNK_BYTES,
} from "@/lib/uploadLimits";

type UploadSessionResponse = OneDriveUploadSession;

let liveUploadPercent = 0;

export function getUploadPercent(
  bytesUploaded: number,
  totalBytes: number,
): number {
  if (
    !Number.isFinite(bytesUploaded) ||
    !Number.isFinite(totalBytes) ||
    totalBytes <= 0
  ) {
    return 0;
  }

  const percent = Math.round((bytesUploaded / totalBytes) * 100);
  return Math.min(100, Math.max(0, percent));
}

export function getLiveUploadPercent(): number {
  return liveUploadPercent;
}

function setLiveUploadPercent(percent: number) {
  liveUploadPercent = Math.min(100, Math.max(0, Math.round(percent)));
}

async function uploadViaSession(
  file: File,
  uploadUrl: string,
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
      setLiveUploadPercent(getUploadPercent(start, file.size));
      continue;
    }

    if (response.status === 201 || response.status === 200) {
      setLiveUploadPercent(getUploadPercent(file.size, file.size));
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
): Promise<OneDriveUploadResult> {
  setLiveUploadPercent(0);

  try {
    if (file.size <= MAX_SIMPLE_UPLOAD_BYTES) {
      const result = await uploadViaApiRoute(file, folder);
      setLiveUploadPercent(100);
      return result;
    }

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
    return uploadViaSession(file, session.uploadUrl);
  } catch (error) {
    setLiveUploadPercent(0);
    throw error;
  }
}
