import Link from "next/link";

import { cn } from "@/lib/utils";

export function PixelLeaf({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={cn("h-6 w-6", className)}
      shapeRendering="crispEdges"
    >
      <rect x="9" y="3" width="6" height="3" fill="#7FFC97" />
      <rect x="15" y="3" width="3" height="3" fill="#0F3D22" />
      <rect x="6" y="6" width="6" height="3" fill="#0F3D22" />
      <rect x="12" y="6" width="6" height="3" fill="#7FFC97" />
      <rect x="6" y="9" width="9" height="3" fill="#7FFC97" />
      <rect x="15" y="9" width="3" height="3" fill="#0F3D22" />
      <rect x="9" y="12" width="6" height="3" fill="#0F3D22" />
      <rect x="9" y="15" width="3" height="6" fill="#0F3D22" />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className={cn("group flex items-center gap-2.5", className)}
      aria-label="FiberMaxxing Kitchen home"
    >
      <PixelLeaf className="h-6 w-6 shrink-0 transition-transform duration-200 group-hover:-translate-y-0.5 sm:h-7 sm:w-7" />
      <span className="flex items-baseline gap-1.5">
        <span className="text-[14px] font-semibold tracking-tight text-ink sm:text-[15px]">
          FiberMaxxing
        </span>
        <span className="display hidden text-[17px] italic text-forest sm:inline">
          Kitchen
        </span>
      </span>
    </Link>
  );
}
