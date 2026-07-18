import Image from "next/image";
import { COMPANY } from "@/lib/constants";
import { IMAGES } from "@/lib/images";
import { cn } from "@/lib/utils";

type SocialIconLinksProps = {
  className?: string;
  size?: "sm" | "md";
};

const SIZE = {
  sm: {
    button: "h-11 w-11",
    image: 44,
  },
  md: {
    button: "h-12 w-12 md:h-14 md:w-14",
    image: 56,
  },
} as const;

export function SocialIconLinks({
  className,
  size = "sm",
}: SocialIconLinksProps) {
  const dims = SIZE[size];

  return (
    <div className={cn("flex gap-3", className)}>
      <a
        href={COMPANY.facebook}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Facebook ASAKA JAPAN"
        className={cn(
          "social-ripple relative shrink-0 overflow-hidden rounded-full shadow-[0_8px_24px_rgb(8_8_9_/_0.18)] transition-transform duration-[400ms] hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-text-secondary)] focus-visible:ring-offset-2",
          dims.button
        )}
      >
        <Image
          src={IMAGES.social.facebook}
          alt="Facebook"
          width={dims.image}
          height={dims.image}
          className="h-full w-full object-cover"
        />
      </a>
      <a
        href={COMPANY.zalo}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Zalo ASAKA JAPAN"
        className={cn(
          "social-ripple relative shrink-0 overflow-hidden rounded-full shadow-[0_8px_24px_rgb(8_8_9_/_0.18)] transition-transform duration-[400ms] hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-text-secondary)] focus-visible:ring-offset-2",
          dims.button
        )}
      >
        <Image
          src={IMAGES.social.zalo}
          alt="Zalo"
          width={dims.image}
          height={dims.image}
          className="h-full w-full object-cover"
        />
      </a>
    </div>
  );
}
