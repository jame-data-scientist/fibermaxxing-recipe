import { AwsClient } from "aws4fetch";

/**
 * Cloudflare R2 speaks the S3 API, so the Vercel deployment writes objects over
 * HTTPS with a scoped access key. Nothing is stored on the Vercel filesystem.
 */

interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
}

function config(): R2Config | null {
  const accountId = process.env.R2_ACCOUNT_ID?.trim();
  const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim();
  const bucket = process.env.R2_BUCKET?.trim();

  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) return null;
  return { accountId, accessKeyId, secretAccessKey, bucket };
}

export function r2Configured() {
  return config() !== null;
}

let client: AwsClient | null = null;

function aws() {
  const settings = config();
  if (!settings) return null;
  client ??= new AwsClient({
    accessKeyId: settings.accessKeyId,
    secretAccessKey: settings.secretAccessKey,
    service: "s3",
    region: "auto",
  });
  return client;
}

function objectUrl(key: string) {
  const settings = config()!;
  const encoded = key
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  return `https://${settings.accountId}.r2.cloudflarestorage.com/${settings.bucket}/${encoded}`;
}

export async function putObject(
  key: string,
  body: Uint8Array,
  contentType = "image/webp",
) {
  const signer = aws();
  if (!signer) throw new Error("R2 is not configured.");

  const response = await signer.fetch(objectUrl(key), {
    method: "PUT",
    body: body as unknown as BodyInit,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `R2 rejected the upload (${response.status})${detail ? `: ${detail.slice(0, 160)}` : ""}`,
    );
  }

  return key;
}

export async function getObject(key: string) {
  const signer = aws();
  if (!signer) return null;

  const response = await signer.fetch(objectUrl(key), { method: "GET" });
  if (!response.ok || !response.body) return null;

  return {
    body: response.body,
    contentType: response.headers.get("content-type") ?? "image/webp",
    contentLength: response.headers.get("content-length"),
    etag: response.headers.get("etag"),
  };
}

/**
 * A custom domain or the bucket's r2.dev URL is faster and cheaper than
 * proxying every image through Vercel. Without one, images are served by
 * /api/images/[...key], which streams the object from R2.
 */
export function imageUrlFor(key: string) {
  const base = process.env.R2_PUBLIC_BASE_URL?.trim();
  if (base) return `${base.replace(/\/+$/, "")}/${key}`;
  return `/api/images/${key}`;
}

export function isOurImageUrl(url: string) {
  if (url.startsWith("/uploads/")) return true;
  if (url.startsWith("/api/images/")) return true;

  const base = process.env.R2_PUBLIC_BASE_URL?.trim();
  if (!base) return false;

  try {
    const allowed = new URL(base);
    const parsed = new URL(url);
    return (
      parsed.protocol === "https:" &&
      parsed.hostname === allowed.hostname &&
      parsed.pathname.startsWith(allowed.pathname.replace(/\/+$/, "") + "/")
    );
  } catch {
    return false;
  }
}
