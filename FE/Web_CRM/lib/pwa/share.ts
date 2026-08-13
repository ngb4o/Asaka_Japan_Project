export type SharePayload = {
  title: string;
  text: string;
  url?: string;
};

export type ShareResult = "shared" | "copied" | "aborted" | "failed";

export function canWebShare(data?: SharePayload) {
  if (typeof navigator === "undefined" || typeof navigator.share !== "function") {
    return false;
  }
  if (!data || typeof navigator.canShare !== "function") return true;
  try {
    return navigator.canShare(data);
  } catch {
    return true;
  }
}

/** Native share sheet when available; otherwise copy text to clipboard. */
export async function shareOrCopy(data: SharePayload): Promise<ShareResult> {
  if (canWebShare(data)) {
    try {
      await navigator.share({
        title: data.title,
        text: data.text,
        url: data.url,
      });
      return "shared";
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return "aborted";
      }
    }
  }

  try {
    const body = data.url ? `${data.text}\n${data.url}` : data.text;
    await navigator.clipboard.writeText(body);
    return "copied";
  } catch {
    return "failed";
  }
}
