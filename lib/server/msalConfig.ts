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

export function getAppOrigin() {
  const configured =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.APP_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : null) ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null);

  return (configured ?? "http://localhost:3000").replace(/\/$/, "");
}

export function getPublicSiteOrigin(req?: {
  headers: {
    host?: string;
    "x-forwarded-proto"?: string | string[];
  };
}) {
  if (process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL) {
    return getAppOrigin();
  }

  if (req?.headers.host && !req.headers.host.includes("localhost")) {
    const protocol =
      typeof req.headers["x-forwarded-proto"] === "string"
        ? req.headers["x-forwarded-proto"].split(",")[0]?.trim()
        : "https";
    return `${protocol}://${req.headers.host}`.replace(/\/$/, "");
  }

  return getAppOrigin();
}

function resolveRedirectUri(path: string, req?: {
  headers: {
    host?: string;
    "x-forwarded-proto"?: string | string[];
  };
}) {
  if (process.env.ONEDRIVE_REDIRECT_URI) {
    return process.env.ONEDRIVE_REDIRECT_URI.replace(/\/$/, "");
  }

  if (process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL) {
    return `${getAppOrigin()}${path}`;
  }

  if (req?.headers.host) {
    const protocol =
      typeof req.headers["x-forwarded-proto"] === "string"
        ? req.headers["x-forwarded-proto"].split(",")[0]?.trim()
        : req.headers.host.includes("localhost")
          ? "http"
          : "https";
    return `${protocol}://${req.headers.host}${path}`;
  }

  return `${getAppOrigin()}${path}`;
}

export function getOneDriveRedirectUri(req?: {
  headers: {
    host?: string;
    "x-forwarded-proto"?: string | string[];
  };
}) {
  return resolveRedirectUri("/api/auth/onedrive/callback", req);
}

export function getUploadAccessRedirectUri(req?: {
  headers: {
    host?: string;
    "x-forwarded-proto"?: string | string[];
  };
}) {
  return resolveRedirectUri("/api/auth/upload-access/callback", req);
}

export function getRegisteredRedirectUris() {
  if (process.env.ONEDRIVE_REDIRECT_URI) {
    return [process.env.ONEDRIVE_REDIRECT_URI.replace(/\/$/, "")];
  }

  const origin = getAppOrigin();
  return [
    `${origin}/api/auth/onedrive/callback`,
    `${origin}/api/auth/upload-access/callback`,
  ];
}
