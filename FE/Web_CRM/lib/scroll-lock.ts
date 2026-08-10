let lockCount = 0;
let scrollRoot: HTMLElement | null = null;
let savedOverflow = "";
let savedScrollTop = 0;

const SCROLL_ROOT_SELECTOR = "[data-crm-scroll-root]";

/** Lock the dashboard main scroller (not document.body — shell scrolls inside <main>). */
export function lockAppScroll(): () => void {
  lockCount += 1;

  if (lockCount === 1) {
    scrollRoot =
      document.querySelector<HTMLElement>(SCROLL_ROOT_SELECTOR) ?? null;

    if (scrollRoot) {
      savedScrollTop = scrollRoot.scrollTop;
      savedOverflow = scrollRoot.style.overflow;
      scrollRoot.style.overflow = "hidden";
    } else {
      savedOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }
  }

  return () => {
    lockCount = Math.max(0, lockCount - 1);
    if (lockCount !== 0) return;

    if (scrollRoot) {
      scrollRoot.style.overflow = savedOverflow;
      scrollRoot.scrollTop = savedScrollTop;
      scrollRoot = null;
    } else {
      document.body.style.overflow = savedOverflow;
    }
  };
}
