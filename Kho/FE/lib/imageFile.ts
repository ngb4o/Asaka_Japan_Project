const HEIC_NAME = /\.hei[cf]$/i;

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
  "image/heic-sequence",
  "image/heif-sequence",
]);

export function isHeicFile(file: File) {
  const type = file.type.toLowerCase();
  return (
    type === "image/heic" ||
    type === "image/heif" ||
    type === "image/heic-sequence" ||
    type === "image/heif-sequence" ||
    HEIC_NAME.test(file.name)
  );
}

export function isAllowedImage(file: File) {
  const type = file.type.toLowerCase();
  if (ALLOWED_MIME.has(type)) return true;
  if (!type || type === "application/octet-stream") {
    return /\.(jpe?g|png|webp|gif|hei[cf])$/i.test(file.name);
  }
  return false;
}

export async function prepareImageFile(file: File) {
  if (!isHeicFile(file)) return file;

  const { default: heic2any } = await import("heic2any");
  const converted = await heic2any({
    blob: file,
    toType: "image/jpeg",
    quality: 0.9,
  });
  const blob = Array.isArray(converted) ? converted[0] : converted;
  const base = file.name.replace(HEIC_NAME, "") || "anh";
  return new File([blob], `${base}.jpg`, { type: "image/jpeg" });
}
