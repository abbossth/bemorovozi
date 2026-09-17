export function LogoMark({ size = 34 }: { size?: number }) {
  return (
    <svg viewBox="0 0 512 512" width={size} height={size} aria-hidden="true">
      <rect width="512" height="512" rx="112" fill="#0F6E5C" />
      <path
        d="M128 152h256a40 40 0 0 1 40 40v128a40 40 0 0 1-40 40h-140l-56 52a8 8 0 0 1-13.5-6.5v-45.5h-46.5a40 40 0 0 1-40-40v-128a40 40 0 0 1 40-40z"
        fill="#FFFFFF"
      />
      <polyline
        points="150,272 198,272 218,228 246,316 268,244 284,272 362,272"
        fill="none"
        stroke="#0F6E5C"
        strokeWidth="14"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="362" cy="272" r="15" fill="#E5534B" />
    </svg>
  );
}

export function Logo({ size = 34, withWordmark = true }: { size?: number; withWordmark?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <LogoMark size={size} />
      {withWordmark && (
        <span className="font-heading font-extrabold text-lg text-ink">
          Bemor<span className="text-teal">Ovozi</span>
        </span>
      )}
    </span>
  );
}
