export const MAX_UPLOAD_BYTES = 4000 * 1024 * 1024;
export const MAX_SIMPLE_UPLOAD_BYTES = 4 * 1024 * 1024;
export const UPLOAD_CHUNK_BYTES = 10 * 1024 * 1024;

export const ACCEPTED_UPLOAD_TYPES = {
  "image/*": [],
  "video/*": [],
} as const;

export function formatMaxUploadSize() {
  return "100 MB";
}
