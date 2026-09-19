import type { ReactNode } from "react";

/** A shimmering placeholder block. Size and shape come from `className` (h-*, w-*, rounded-*). */
export function Skeleton({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return <div aria-hidden className={`skeleton rounded-md ${className}`} style={style} />;
}

/**
 * Wraps a group of placeholders so assistive tech announces "loading" once (instead of reading nothing
 * or a wall of empty blocks) and marks the region busy.
 */
export function LoadingRegion({
  label = "Yuklanmoqda…",
  className = "",
  children,
}: {
  label?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div role="status" aria-busy="true" aria-live="polite" className={className}>
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}
