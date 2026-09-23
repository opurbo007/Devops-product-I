import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import sharp from "sharp";

// Chaos kill-switches for the image path (mirrors INVENTORY_FAIL_RESERVE):
// - IMAGE_FAIL_UPLOAD=1 → upload rejected before any conversion/DB write
//   (simulates a storage outage; client should surface retryable 502).
// - IMAGE_FAIL_WEBP=1 → WebP conversion throws (simulates sharp/libvips
//   crash or OOM on a corrupt file; temp files are cleaned, no orphan rows).
// - IMAGE_SKIP_WEBP=1 → conversion skipped, original JPEG/PNG served as-is
//   (degraded fast-path: functionally correct but larger/slower — the
//   response marks degraded:true so Chaos Lab can show the tradeoff).
// - IMAGE_FAIL_SERVE=1 → GET /images/* returns 502 (simulates disk/CDN
//   failure on the read path; frontend must fall back to glyph).
export const IMAGE_CHAOS_FLAGS = [
  "IMAGE_FAIL_UPLOAD",
  "IMAGE_FAIL_WEBP",
  "IMAGE_SKIP_WEBP",
  "IMAGE_FAIL_SERVE",
] as const;

export function imageUploadForcedFail(): boolean {
  return process.env.IMAGE_FAIL_UPLOAD === "1";
}

export function webpConvertForcedFail(): boolean {
  return process.env.IMAGE_FAIL_WEBP === "1";
}

export function webpSkipped(): boolean {
  return process.env.IMAGE_SKIP_WEBP === "1";
}

export function imageServeForcedFail(): boolean {
  return process.env.IMAGE_FAIL_SERVE === "1";
}

export interface ConvertResult {
  filename: string;
  converted: boolean;
  degraded: boolean;
}

/**
 * Convert an uploaded image to WebP for speed (smaller payload, faster
 * storefront loads). Resizes down to max 1600px wide, quality 80.
 * Returns the final filename + flags. Cleans up the source temp file on
 * success; on failure cleans up everything and throws.
 */
export async function toWebp(
  uploadDir: string,
  tmpPath: string,
): Promise<ConvertResult> {
  if (webpConvertForcedFail()) {
    throw new Error("forced WebP conversion failure (IMAGE_FAIL_WEBP=1)");
  }
  const outFilename = `${crypto.randomUUID()}.webp`;
  const outPath = path.join(uploadDir, outFilename);
  try {
    await sharp(tmpPath, { failOn: "none" })
      .rotate()
      .resize({ width: 1600, withoutEnlargement: true })
      .webp({ quality: 80 })
      .toFile(outPath);
    await fs.promises.unlink(tmpPath).catch(() => {});
    return { filename: outFilename, converted: true, degraded: false };
  } catch (e) {
    await fs.promises.unlink(tmpPath).catch(() => {});
    await fs.promises.unlink(outPath).catch(() => {});
    throw e;
  }
}

export async function removeFile(p: string): Promise<void> {
  await fs.promises.unlink(p).catch(() => {});
}
