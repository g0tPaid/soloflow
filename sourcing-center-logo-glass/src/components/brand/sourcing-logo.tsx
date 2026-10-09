import { cn } from "@/lib/utils";
import { SevenColorMark } from "@/components/brand/seven-color-mark";

type SourcingLogoProps = {
  className?: string;
  /** Compact for nav; hero for first viewport brand */
  size?: "nav" | "hero" | "footer";
  /** Show Seven Color byline under the mark */
  showByline?: boolean;
  /** Light wordmark for dark backgrounds (e.g. footer) */
  onDark?: boolean;
};

const BRAND_RED = "#E31C23";

/**
 * Official sourcing.center wordmark with the Seven Color 7 on Apple glass.
 */
export function SourcingLogo({
  className,
  size = "nav",
  showByline = false,
  onDark = false,
}: SourcingLogoProps) {
  const word =
    size === "hero"
      ? "text-[2.75rem] leading-none sm:text-6xl md:text-7xl lg:text-[5.25rem]"
      : size === "footer"
        ? "text-3xl leading-none"
        : "text-[1.2rem] leading-none sm:text-[1.35rem]";

  const sideMark = size === "hero" ? 64 : size === "footer" ? 40 : 36;
  const ink = onDark ? "text-white" : "text-ink";

  return (
    <span className={cn("inline-flex flex-col leading-none", className)}>
      <span className="inline-flex items-center gap-3 sm:gap-4">
        <SevenColorMark size={sideMark} />
        <span
          className={cn(
            "font-logo inline-flex items-baseline font-bold tracking-[-0.03em]",
            word,
          )}
          aria-hidden
        >
          <span className={ink}>sourc</span>
          <span className={cn("relative inline-block", ink)}>
            ı
            <span
              className="absolute left-1/2 top-[0.08em] h-[0.2em] w-[0.2em] -translate-x-1/2 rounded-full"
              style={{ backgroundColor: BRAND_RED }}
            />
          </span>
          <span className={ink}>ng</span>
          <span style={{ color: BRAND_RED }}>.</span>
          <span style={{ color: BRAND_RED }}>center</span>
        </span>
      </span>

      {showByline ? (
        <span
          className={cn(
            "mt-4 inline-flex items-center gap-2 font-sans font-medium",
            onDark ? "text-white/70" : "text-ink-soft",
            size === "hero" ? "mt-2.5 text-xs sm:mt-3 sm:text-sm" : "text-xs",
          )}
        >
          <span>by Seven Color Trading · China</span>
        </span>
      ) : null}

      <span className="sr-only">sourcing.center by Seven Color</span>
    </span>
  );
}
