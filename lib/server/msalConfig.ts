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
  const configured =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.APP_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null);

  return (configured ?? "http://localhost:3000").replace(/\/$/, "");
}

export function getOneDriveRedirectUri(req?: {
  headers: {
    host?: string;
    "x-forwarded-proto"?: string | string[];
  };
}) {
  if (req?.headers.host) {
    const protocol =
      typeof req.headers["x-forwarded-proto"] === "string"
        ? req.headers["x-forwarded-proto"].split(",")[0]?.trim()
        : req.headers.host.includes("localhost")
          ? "http"
          : "https";
    return `${protocol}://${req.headers.host}/api/auth/onedrive/callback`;
  }

  return `${getAppOrigin()}/api/auth/onedrive/callback`;
}
