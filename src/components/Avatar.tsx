/** Round initial-letter avatar (no photos exist for staff). */
export function Avatar({ name, size = 28, className = "" }: { name: string; size?: number; className?: string }) {
  return (
    <span
      className={`flex flex-shrink-0 items-center justify-center rounded-full bg-teal font-heading font-extrabold text-white ${className}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.42) }}
      aria-hidden
    >
      {(name.trim()[0] ?? "?").toUpperCase()}
    </span>
  );
}
