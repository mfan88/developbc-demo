export const UPLOAD_FOLDER_NAME = "GMA Videos";

export const MAX_UPLOAD_BYTES = 4000 * 1024 * 1024;
export const MAX_SIMPLE_UPLOAD_BYTES = 4 * 1024 * 1024;
export const UPLOAD_CHUNK_BYTES = 10 * 1024 * 1024;

export const ACCEPTED_UPLOAD_TYPES = {
  "image/*": [],
  "video/*": [],
} as const;

export function formatMaxUploadSize() {
  return "4 GB";
}

export type OneDriveUploadResult = {
  id: string;
  name: string;
  webUrl: string;
  size: number;
};

export type OneDriveUploadSession = {
  uploadUrl: string;
  expirationDateTime: string;
};

function encodeDrivePath(path: string) {
  return path.split("/").map(encodeURIComponent).join("/");
}

export function buildDriveItemPath(filename: string) {
  return `${UPLOAD_FOLDER_NAME}/${filename}`;
}

export function sanitizeUploadFilename(filename: string) {
  const base = filename.split(/[/\\]/).pop()?.trim();
  if (!base) {
    throw new Error("A valid filename is required.");
  }
  return base;
}

export function assertValidUploadSize(fileSize: number) {
  if (!Number.isFinite(fileSize) || fileSize <= 0) {
    throw new Error("File size is required.");
  }
  if (fileSize > MAX_UPLOAD_BYTES) {
    throw new Error(
      `Files must be ${MAX_UPLOAD_BYTES / (1024 * 1024)} MB or smaller.`,
    );
  }
}

async function parseGraphError(res: Response) {
  const details = await res.text();
  if (details.includes("SPO license")) {
    throw new Error(
      "This upload needs a personal @outlook.com or @hotmail.com account. Connect a personal Microsoft account at /setup.",
    );
  }
  throw new Error(
    `Upload failed (${res.status}): ${details || res.statusText}`,
  );
}

export async function uploadSmallFileToOneDrive(
  file: File,
  accessToken: string,
): Promise<OneDriveUploadResult> {
  if (file.size > MAX_SIMPLE_UPLOAD_BYTES) {
    throw new Error("Use a resumable upload session for files over 4 MB.");
  }

  const path = buildDriveItemPath(file.name);
  const encodedPath = encodeDrivePath(path);
  const res = await fetch(
    `https://graph.microsoft.com/v1.0/me/drive/root:/${encodedPath}:/content`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": file.type || "application/octet-stream",
      },
      body: file,
    },
  );

  if (!res.ok) {
    await parseGraphError(res);
  }

  const item = (await res.json()) as OneDriveUploadResult;
  if (!item.webUrl) {
    throw new Error("Upload succeeded but OneDrive did not return a file URL.");
  }

  return item;
}

export async function createOneDriveUploadSession(
  accessToken: string,
  filename: string,
): Promise<OneDriveUploadSession> {
  const path = buildDriveItemPath(filename);
  const encodedPath = encodeDrivePath(path);
  const res = await fetch(
    `https://graph.microsoft.com/v1.0/me/drive/root:/${encodedPath}:/createUploadSession`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        item: {
          "@microsoft.graph.conflictBehavior": "rename",
          name: filename,
        },
      }),
    },
  );

  if (!res.ok) {
    await parseGraphError(res);
  }

  const session = (await res.json()) as OneDriveUploadSession;
  if (!session.uploadUrl) {
    throw new Error("OneDrive did not return an upload session URL.");
  }

  return session;
}
