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

const MAX_EDGE = 1600;
const MAX_JPEG_BYTES = 1_500_000;

function jpegName(file: File) {
  const base = file.name.replace(/\.[^.]+$/, "") || "anh";
  return `${base}.jpg`;
}

async function loadImage(blob: Blob) {
  const url = URL.createObjectURL(blob);
  try {
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("Không đọc được ảnh"));
      image.src = url;
    });
    return image;
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function toResizedJpeg(blob: Blob, name: string) {
  const image = await loadImage(blob);
  const edge = Math.max(image.naturalWidth, image.naturalHeight);
  const alreadySmall = edge <= MAX_EDGE && blob.size <= MAX_JPEG_BYTES && blob.type === "image/jpeg";
  if (alreadySmall) return new File([blob], name, { type: "image/jpeg" });

  const scale = Math.min(1, MAX_EDGE / Math.max(edge, 1));
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Không xử lý được ảnh");
  context.drawImage(image, 0, 0, width, height);

  const output = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => (result ? resolve(result) : reject(new Error("Không xử lý được ảnh"))),
      "image/jpeg",
      0.82
    );
  });
  return new File([output], name, { type: "image/jpeg" });
}

export async function prepareImageFile(file: File) {
  const name = jpegName(file);
  if (isHeicFile(file)) {
    const { default: heic2any } = await import("heic2any");
    const converted = await heic2any({
      blob: file,
      toType: "image/jpeg",
      quality: 0.82,
    });
    const blob = Array.isArray(converted) ? converted[0] : converted;
    return toResizedJpeg(blob, name);
  }

  if (file.type === "image/gif") return file;
  if (file.size <= MAX_JPEG_BYTES && (file.type === "image/jpeg" || file.type === "image/jpg")) return file;

  try {
    return await toResizedJpeg(file, name);
  } catch {
    return file;
  }
}
