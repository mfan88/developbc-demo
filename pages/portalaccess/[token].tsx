import type { GetServerSideProps } from "next";
import { Redis } from "@upstash/redis";
import { createPortalAccessCookieHeader } from "@/lib/server/uploadAccess";

const redis = Redis.fromEnv();

export const getServerSideProps: GetServerSideProps = async (context) => {
  const token = context.params?.token;
  if (typeof token !== "string" || !token) {
    return { redirect: { destination: "/link-expired", permanent: false } };
  }

  try {
    const status = await redis.getdel(`link:${token}`);

    if (status !== "unused") {
      return { redirect: { destination: "/link-expired", permanent: false } };
    }

    context.res.setHeader("Set-Cookie", createPortalAccessCookieHeader());

    return {
      redirect: { destination: "/", permanent: false },
    };
  } catch (error) {
    console.error("Portal access token check failed:", error);
    return { redirect: { destination: "/link-expired", permanent: false } };
  }
};

export default function AccessGate() {
  return null;
}