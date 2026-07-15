import {
  type OneDriveUploadResult,
  type OneDriveUploadSession,
} from "@/lib/graphUpload";
import { renameFileForUpload } from "@/lib/uploadNaming";
import { MAX_SIMPLE_UPLOAD_BYTES, UPLOAD_CHUNK_BYTES } from "@/lib/graphUpload";

type UploadSessionResponse = OneDriveUploadSession;

let liveUploadPercent = 0;
const uploadPercentListeners = new Set<(percent: number) => void>();

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

export function subscribeToLiveUploadPercent(
  listener: (percent: number) => void,
): () => void {
  uploadPercentListeners.add(listener);
  listener(liveUploadPercent);
  return () => {
    uploadPercentListeners.delete(listener);
  };
}

function setLiveUploadPercent(percent: number) {
  liveUploadPercent = Math.min(100, Math.max(0, Math.round(percent)));
  for (const listener of uploadPercentListeners) {
    listener(liveUploadPercent);
  }
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

async function uploadViaApiRoute(file: File): Promise<OneDriveUploadResult> {
  const formData = new FormData();
  formData.append("file", file);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/upload");

    xhr.upload.addEventListener("progress", (event) => {
      if (!event.lengthComputable) return;
      setLiveUploadPercent(getUploadPercent(event.loaded, event.total));
    });

    xhr.addEventListener("load", () => {
      let payload: OneDriveUploadResult | { error?: string };
      try {
        payload = JSON.parse(xhr.responseText) as
          | OneDriveUploadResult
          | { error?: string };
      } catch {
        reject(new Error("Upload failed"));
        return;
      }

      if (xhr.status >= 200 && xhr.status < 300) {
        setLiveUploadPercent(100);
        resolve(payload as OneDriveUploadResult);
        return;
      }

      reject(
        new Error(
          "error" in payload && payload.error ? payload.error : "Upload failed",
        ),
      );
    });

    xhr.addEventListener("error", () => reject(new Error("Upload failed")));
    xhr.addEventListener("abort", () => reject(new Error("Upload cancelled")));

    xhr.send(formData);
  });
}

export async function uploadFileToOneDrive(
  file: File,
  dateTaken: Date,
): Promise<OneDriveUploadResult> {
  setLiveUploadPercent(0);
  const uploadFile = renameFileForUpload(file, dateTaken);

  try {
    if (uploadFile.size <= MAX_SIMPLE_UPLOAD_BYTES) {
      return uploadViaApiRoute(uploadFile);
    }

    const sessionResponse = await fetch("/api/upload/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filename: uploadFile.name,
        fileSize: uploadFile.size,
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
    return uploadViaSession(uploadFile, session.uploadUrl);
  } catch (error) {
    setLiveUploadPercent(0);
    throw error;
  }
}
