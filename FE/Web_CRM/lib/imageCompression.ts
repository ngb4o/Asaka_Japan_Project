import imageCompression from "browser-image-compression";

const MAX_DIMENSION = 1920;
const MAX_SIZE_MB = 8;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

export async function compressImage(file: File): Promise<File> {
  if (file.size <= MAX_SIZE_BYTES) return file;

  const options = {
    maxSizeMB: MAX_SIZE_MB,
    maxWidthOrHeight: MAX_DIMENSION,
    useWebWorker: true,
    fileType: "image/jpeg" as const,
    initialQuality: 0.85,
  };

  try {
    const compressed = await imageCompression(file, options);
    return compressed;
  } catch {
    return file;
  }
}
