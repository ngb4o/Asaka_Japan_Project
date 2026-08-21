let lockCount = 0;
let savedOverflow = "";

export function lockAppScroll(): () => void {
  lockCount += 1;

  if (lockCount === 1) {
    savedOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  }

  return () => {
    lockCount = Math.max(0, lockCount - 1);
    if (lockCount !== 0) return;
    document.body.style.overflow = savedOverflow;
  };
}
