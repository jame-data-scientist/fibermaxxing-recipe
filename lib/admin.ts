import { createHmac, timingSafeEqual } from "node:crypto";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

/**
 * No visitor accounts, no sign-up: submissions are anonymous and moderated by
 * whoever holds ADMIN_KEY. The cookie only carries an HMAC of the key, never
 * the key itself, so it can be rotated by changing the env var.
 */

const COOKIE = "fm_moderator";
const MAX_AGE = 60 * 60 * 12;

function adminKey() {
  return process.env.ADMIN_KEY?.trim() ?? "";
}

export function adminConfigured() {
  return adminKey().length >= 8;
}

function signature() {
  return createHmac("sha256", adminKey()).update("moderator-v1").digest("hex");
}

function safeEqual(a: string | undefined, b: string) {
  if (!a || !b) return false;
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function verifyAdminKey(candidate: string) {
  if (!adminConfigured()) return false;
  return safeEqual(candidate.trim(), adminKey());
}

export async function setAdminCookie() {
  (await cookies()).set(COOKIE, signature(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function clearAdminCookie() {
  (await cookies()).delete(COOKIE);
}

export async function isAdmin() {
  if (!adminConfigured()) return false;
  const value = (await cookies()).get(COOKIE)?.value;
  return safeEqual(value, signature());
}

export async function requireAdmin() {
  if (!(await isAdmin())) redirect("/admin/login");
}
