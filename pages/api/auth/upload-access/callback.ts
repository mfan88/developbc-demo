import type { NextApiRequest, NextApiResponse } from "next";
import { handleOneDriveOAuthCallback } from "@/lib/server/handleOneDriveOAuthCallback";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  return handleOneDriveOAuthCallback(req, res);
}
