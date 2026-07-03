import crypto from "node:crypto";
import type { NextApiRequest } from "next";
import { getOneDriveConnectionStatus } from "@/lib/server/onedriveAuth";

export const UPLOAD_ACCESS_COOKIE = "upload_access";
export const PORTAL_ACCESS_MAX_AGE_SECONDS = 60 * 60 * 24;
export const ADMIN_ACCESS_MAX_AGE_SECONDS = 60 * 60 * 12;

type PortalAccessPayload = {
  type: "portal";
  exp: number;
};

type AdminAccessPayload = {
  type: "admin";
  username: string;
  exp: number;
};

type AccessPayload = PortalAccessPayload | AdminAccessPayload;

function getUploadAccessSecret() {
  const secret =
    process.env.UPLOAD_ACCESS_SECRET ?? process.env.UPSTASH_REDIS_REST_TOKEN;
  if (secret) return secret;

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "Missing UPLOAD_ACCESS_SECRET. Add it to your Vercel environment variables.",
    );
  }

  return "dev-upload-access-secret";
}

function signPayload(payload: AccessPayload) {
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", getUploadAccessSecret())
    .update(data)
    .digest("base64url");

  return `${data}.${signature}`;
}

function readAccessPayload(cookieHeader: string | undefined): AccessPayload | null {
  if (!cookieHeader) return null;

  for (const part of cookieHeader.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name !== UPLOAD_ACCESS_COOKIE) continue;

    const value = decodeURIComponent(rest.join("="));
    const [data, signature] = value.split(".");
    if (!data || !signature) return null;

    const expectedSignature = crypto
      .createHmac("sha256", getUploadAccessSecret())
      .update(data)
      .digest("base64url");

    const signatureBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);
    if (
      signatureBuffer.length !== expectedBuffer.length ||
      !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)
    ) {
      return null;
    }

    try {
      const payload = JSON.parse(
        Buffer.from(data, "base64url").toString("utf8"),
      ) as AccessPayload;

      if (!payload?.type || typeof payload.exp !== "number") {
        return null;
      }

      if (payload.exp <= Math.floor(Date.now() / 1000)) {
        return null;
      }

      return payload;
    } catch {
      return null;
    }
  }

  return null;
}

function buildCookieHeader(value: string, maxAgeSeconds: number) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${UPLOAD_ACCESS_COOKIE}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeconds}${secure}`;
}

export function createPortalAccessCookieHeader() {
  const payload: PortalAccessPayload = {
    type: "portal",
    exp: Math.floor(Date.now() / 1000) + PORTAL_ACCESS_MAX_AGE_SECONDS,
  };

  return buildCookieHeader(
    signPayload(payload),
    PORTAL_ACCESS_MAX_AGE_SECONDS,
  );
}

export function createAdminAccessCookieHeader(username: string) {
  const payload: AdminAccessPayload = {
    type: "admin",
    username,
    exp: Math.floor(Date.now() / 1000) + ADMIN_ACCESS_MAX_AGE_SECONDS,
  };

  return buildCookieHeader(signPayload(payload), ADMIN_ACCESS_MAX_AGE_SECONDS);
}

export function clearUploadAccessCookieHeader() {
  return `${UPLOAD_ACCESS_COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`;
}

function hasValidPortalAccess(cookieHeader: string | undefined) {
  const payload = readAccessPayload(cookieHeader);
  return payload?.type === "portal";
}

export async function canAccessUploadPortal(req: {
  headers: { cookie?: string };
}) {
  const status = await getOneDriveConnectionStatus();
  if (!status.connected) {
    return { allowed: true as const, connected: false as const };
  }

  if (hasValidPortalAccess(req.headers.cookie)) {
    return { allowed: true as const, connected: true as const };
  }

  return {
    allowed: false as const,
    connected: true as const,
    loginUrl: "/api/auth/upload-access/login",
  };
}

export async function assertUploadPortalAccess(
  req: NextApiRequest,
  res: { status: (code: number) => { json: (body: unknown) => void } },
) {
  const access = await canAccessUploadPortal(req);
  if (access.allowed) return true;

  res.status(401).json({
    error: "Upload access required. Use a parent link or sign in with the receiving OneDrive account.",
  });
  return false;
}
