import { createHash } from "node:crypto";
import { headers } from "next/headers";

export async function requestMeta() {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  const ip =
    forwarded?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    h.get("cf-connecting-ip") ||
    "local";

  const salt = process.env.BETTER_AUTH_SECRET ?? "dev";
  const ipHash = createHash("sha256").update(`${ip}:${salt}`).digest("hex");

  return { ip, ipHash, userAgent: h.get("user-agent") ?? "" };
}
