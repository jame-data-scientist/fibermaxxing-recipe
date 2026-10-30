import { createHash, randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

import { imageUrlFor, isOurImageUrl, putObject, r2Configured } from "@/lib/r2";

/**
 * The browser already shrinks photos to stay under Vercel's 4.5 MB request
 * limit; this ceiling covers anything that skips that step. Only the URL is
 * stored in D1, never the bytes.
 */
const MAX_BYTES = 10 * 1024 * 1024;

function looksLikeImage(buffer: Buffer): boolean {
  if (buffer.length < 12) return false;
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return true;
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return true;
  }
  const riff = buffer.subarray(0, 4).toString("ascii");
  const webp = buffer.subarray(8, 12).toString("ascii");
  return riff === "RIFF" && webp === "WEBP";
}

export interface StoredImage {
  url: string;
  sha256: string;
  bytes: number;
  width: number;
  height: number;
}

/**
 * Every upload is re-encoded through sharp: resized to at most 1600 px, encoded
 * as WebP, and stripped of EXIF (including GPS) before it is published. The
 * SHA-256 of the original file is kept as provenance evidence for takedowns.
 */
export async function storeImage(file: File): Promise<StoredImage> {
  if (file.size > MAX_BYTES) {
    throw new Error("That image is over 10 MB. Try a smaller one.");
  }

  const original = Buffer.from(await file.arrayBuffer());
  if (!looksLikeImage(original)) {
    throw new Error("Please upload a JPEG, PNG or WebP photo.");
  }

  const sha256 = createHash("sha256").update(original).digest("hex");

  let processed: Buffer;
  let width = 0;
  let height = 0;
  try {
    const pipeline = sharp(original)
      .rotate()
      .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 78, effort: 4 });

    const result = await pipeline.toBuffer({ resolveWithObject: true });
    processed = result.data;
    width = result.info.width;
    height = result.info.height;
  } catch {
    throw new Error("That image could not be read. Please use a JPEG or PNG.");
  }

  const key = `recipes/${new Date().getUTCFullYear().toString()}/${sha256.slice(0, 2)}/${sha256.slice(0, 16)}-${randomUUID().slice(0, 8)}.webp`;

  if (r2Configured()) {
    try {
      await putObject(
        key,
        new Uint8Array(processed.buffer, processed.byteOffset, processed.byteLength),
        "image/webp",
      );
    } catch (error) {
      console.error("[upload] R2 write failed", error);
      throw new Error(
        "The photo could not be stored right now. Please try again in a moment.",
      );
    }
    return {
      url: imageUrlFor(key),
      sha256,
      bytes: processed.length,
      width,
      height,
    };
  }

  if (process.env.VERCEL) {
    throw new Error(
      "Photo storage is not configured yet. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY and R2_BUCKET.",
    );
  }

  // Local development without R2 credentials: keep the same WebP output on
  // disk so the upload path behaves identically to production.
  const dir = path.join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  const filename = `${sha256.slice(0, 24)}.webp`;
  await writeFile(path.join(dir, filename), processed);
  return {
    url: `/uploads/${filename}`,
    sha256,
    bytes: processed.length,
    width,
    height,
  };
}

/** Only storage this app wrote may be referenced by a submission. */
export function isAllowedImageUrl(url: string): boolean {
  if (!url) return false;
  return isOurImageUrl(url);
}
