import Image from "next/image";
import { cn } from "@/lib/utils";

/** Official Seven Color mark — red geometric 7 on Apple-style glass. */
export function SevenColorMark({
  className,
  size = 40,
  title = "Seven Color",
}: {
  className?: string;
  size?: number;
  title?: string;
}) {
  return (
    <span
      className={cn("logo-glass relative inline-flex shrink-0 items-center justify-center", className)}
      style={{ width: size, height: size }}
    >
      <Image
        src="/seven-color-mark-clear.png"
        alt={title}
        width={size}
        height={size}
        className="relative z-[1] h-[78%] w-[78%] object-contain"
        priority
        unoptimized
      />
    </span>
  );
}
