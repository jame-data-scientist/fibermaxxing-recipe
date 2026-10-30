import { getObject, r2Configured } from "@/lib/r2";

export const runtime = "nodejs";

/**
 * Fallback delivery for installs without an R2 public domain: stream the object
 * straight from the bucket. Set R2_PUBLIC_BASE_URL to serve images from
 * Cloudflare's edge instead and skip this hop entirely.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ key: string[] }> },
) {
  const { key } = await params;
  const objectKey = key.join("/");

  if (
    !objectKey ||
    objectKey.includes("..") ||
    !/^[a-zA-Z0-9][a-zA-Z0-9/_.-]*$/.test(objectKey) ||
    !r2Configured()
  ) {
    return new Response("Not found", { status: 404 });
  }

  const object = await getObject(objectKey);
  if (!object) return new Response("Not found", { status: 404 });

  return new Response(object.body, {
    headers: {
      "Content-Type": object.contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
      ...(object.contentLength ? { "Content-Length": object.contentLength } : {}),
      ...(object.etag ? { ETag: object.etag } : {}),
    },
  });
}
