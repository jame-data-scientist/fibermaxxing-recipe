/**
 * Cloudflare Turnstile. When no secret is configured (local development) the
 * check is skipped rather than blocking every submission.
 */
export async function verifyTurnstile(
  token: string | null | undefined,
  ip?: string,
): Promise<{ ok: boolean; message?: string }> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return { ok: true };

  if (!token) {
    return { ok: false, message: "Please complete the spam check." };
  }

  try {
    const body = new URLSearchParams({ secret, response: token });
    if (ip && ip !== "local") body.set("remoteip", ip);

    const response = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      { method: "POST", body, cache: "no-store" },
    );
    const data = (await response.json()) as { success?: boolean };
    if (data.success) return { ok: true };
    return { ok: false, message: "The spam check failed. Please try again." };
  } catch {
    return { ok: false, message: "Could not verify the spam check. Try again." };
  }
}
