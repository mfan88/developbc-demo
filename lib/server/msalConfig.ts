import path from "node:path";

export const msalClientId =
  process.env.NEXT_PUBLIC_AZURE_CLIENT_ID ??
  process.env.AZURE_CLIENT_ID ??
  "";

export const msalAuthority =
  process.env.AZURE_AUTHORITY ??
  "https://login.microsoftonline.com/consumers";

export const graphScopes = [
  "User.Read",
  "Files.ReadWrite",
  "offline_access",
] as const;

export const uploadScopes = ["Files.ReadWrite"] as const;

export const ONEDRIVE_CACHE_PATH =
  process.env.ONEDRIVE_CACHE_PATH ??
  path.join(process.cwd(), ".data", "onedrive-cache.json");

export function getAppOrigin() {
  return (
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.APP_URL ??
    "http://localhost:3000"
  );
}

export function getOneDriveRedirectUri() {
  return `${getAppOrigin()}/api/auth/onedrive/callback`;
}
