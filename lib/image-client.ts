/**
 * Photos are shrunk in the browser before they are uploaded.
 *
 * Vercel Functions reject request bodies above 4.5 MB, and phone cameras
 * routinely produce 5–10 MB JPEGs, so an unmodified photo would fail with a
 * 413 before the upload route ran a single line. Re-encoding here also makes
 * the upload quick on mobile data. The server still re-encodes with sharp, so
 * this is a transport optimisation, not a security boundary.
 */

/** Vercel's ceiling is 4.5 MB; stay clear of it to leave room for the form. */
export const MAX_UPLOAD_BYTES = 3.5 * 1024 * 1024;

/** Matches the longest edge the server keeps, so nothing visible is lost. */
export const MAX_EDGE = 1600;

/** Scale a photo down to fit a square of `maxEdge`, never enlarging it. */
export function fitWithin(
  width: number,
  height: number,
  maxEdge: number = MAX_EDGE,
): { width: number; height: number; scale: number } {
  if (width <= 0 || height <= 0) return { width: 0, height: 0, scale: 1 };

  const scale = Math.min(1, maxEdge / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
    scale,
  };
}

async function decode(file: File): Promise<ImageBitmap | null> {
  try {
    return await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    // Older Safari rejects the options bag; the plain call still decodes.
    try {
      return await createImageBitmap(file);
    } catch {
      return null;
    }
  }
}

function encode(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/webp", quality));
}

/**
 * Returns the original file when it is already small enough, otherwise a WebP
 * capped at MAX_EDGE and MAX_UPLOAD_BYTES. Unsupported formats fall through
 * untouched so the server can explain the problem.
 */
export async function prepareImageForUpload(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file;

  const bitmap = await decode(file);
  if (!bitmap) return file;

  const smallEnough =
    file.size <= MAX_UPLOAD_BYTES &&
    bitmap.width <= MAX_EDGE &&
    bitmap.height <= MAX_EDGE;

  if (smallEnough) {
    bitmap.close();
    return file;
  }

  const { width, height } = fitWithin(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    return file;
  }

  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  let best: Blob | null = null;
  let quality = 0.82;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const blob = await encode(canvas, quality);
    if (!blob) break;
    best = blob;
    if (blob.size <= MAX_UPLOAD_BYTES) break;
    quality -= 0.12;
  }

  if (!best) return file;

  const name = file.name.replace(/\.[^.]+$/, "") || "photo";
  return new File([best], `${name}.webp`, {
    type: best.type || "image/webp",
  });
}
