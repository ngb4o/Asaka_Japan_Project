import Link from "next/link";
import { ArrowLeft } from "lucide-react";

type BackLinkProps = {
  href: string;
  label: string;
};

export function BackLink({ href, label }: BackLinkProps) {
  return (
    <Link
      href={href}
      className="mb-6 inline-flex items-center gap-2 text-[length:var(--text-sm)] font-semibold text-[var(--color-text-secondary)] transition-colors hover:text-[#016502] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-text-secondary)] rounded-sm sm:text-[length:var(--text-md)]"
    >
      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
      Quay lại {label}
    </Link>
  );
}
