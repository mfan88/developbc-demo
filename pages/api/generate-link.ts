import { Redis } from "@upstash/redis";
import { randomUUID } from "node:crypto";
import type { NextApiRequest, NextApiResponse } from "next";
import { getPublicSiteOrigin } from "@/lib/server/msalConfig";

const redis = Redis.fromEnv();

const LINK_TTL_SECONDS = 60 * 60 * 24;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const token = randomUUID();
    await redis.set(`link:${token}`, "unused", { ex: LINK_TTL_SECONDS });

    const url = `${getPublicSiteOrigin(req)}/portalaccess/${token}`;
    return res.status(200).json({ url, expiresInSeconds: LINK_TTL_SECONDS });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not generate link";
    return res.status(500).json({ error: message });
  }
}
