import Image from "next/image";
import { COMPANY } from "@/lib/constants";
import { IMAGES } from "@/lib/images";
import { cn } from "@/lib/utils";

type BrandLogoProps = {
  className?: string;
  size?: number;
  priority?: boolean;
};

export function BrandLogo({
  className,
  size = 44,
  priority = false,
}: BrandLogoProps) {
  // Render 2x for sharper display on retina screens
  const renderSize = size * 2;

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.04)]",
        className
      )}
      style={{ width: size, height: size }}
    >
      <span className="relative h-full w-full overflow-hidden rounded-full">
        <Image
          src={IMAGES.brand.logo}
          alt={`Logo ${COMPANY.shortName}`}
          width={renderSize}
          height={renderSize}
          quality={100}
          priority={priority}
          sizes={`${size}px`}
          className="h-full w-full object-contain [image-rendering:-webkit-optimize-contrast]"
        />
      </span>
    </span>
  );
}
