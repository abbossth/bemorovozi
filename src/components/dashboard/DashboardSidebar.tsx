"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogoMark } from "@/components/Logo";
import { Avatar } from "@/components/Avatar";

const NAV = [
  {
    href: "/dashboard",
    label: "Xabarlar",
    icon: <path d="M4 6h16M4 12h16M4 18h10" strokeLinecap="round" />,
  },
  {
    href: "/dashboard/leads",
    label: "Lidlar",
    icon: (
      <>
        <path d="M3 5h18v3l-9 6-9-6V5z" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M3 8v11h18V8" strokeLinecap="round" strokeLinejoin="round" />
      </>
    ),
  },
  {
    href: "/dashboard/settings",
    label: "Sozlamalar",
    icon: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path
          d="M19 12a7 7 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7 7 0 0 0-2-1.2L14 3h-4l-.5 2.6a7 7 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6A7 7 0 0 0 5 12a7 7 0 0 0 .1 1.2l-2 1.6 2 3.4 2.4-1a7 7 0 0 0 2 1.2L10 21h4l.5-2.6a7 7 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2z"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </>
    ),
  },
];

function SidebarContent({
  staffName,
  staffRole,
  onNavigate,
}: {
  staffName: string;
  staffRole: string;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex h-full w-60 flex-shrink-0 flex-col bg-navy px-5 py-7">
      <div className="mb-6 flex items-center gap-2.5 px-1">
        <LogoMark size={30} />
        <span className="font-heading text-base font-extrabold text-white">BemorOvozi</span>
      </div>

      <nav className="flex flex-col gap-1">
        {NAV.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5"
              style={{ background: active ? "rgba(255,255,255,0.08)" : "transparent", opacity: active ? 1 : 0.7 }}
            >
              <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="#FFFFFF" strokeWidth={1.8}>
                {item.icon}
              </svg>
              <span className="text-sm font-semibold text-white">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto flex flex-col gap-1 border-t border-white/10 pt-4">
        <div className="flex items-center gap-3 px-1 py-1.5">
          <Avatar name={staffName} size={36} />
          <div className="flex min-w-0 flex-col leading-tight">
            <span className="truncate text-sm font-semibold text-white">{staffName}</span>
            <span className="truncate text-xs text-white/60">{staffRole}</span>
          </div>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold text-white/80 transition hover:bg-white/10 hover:text-white"
        >
          <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={1.8}>
            <path d="M9 4H5v16h4M16 8l4 4-4 4M20 12H9" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Chiqish
        </button>
      </div>
    </div>
  );
}

export function DashboardSidebar({
  staffName,
  staffRole,
  children,
}: {
  staffName: string;
  staffRole: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const activeLabel = NAV.find((n) => n.href === pathname)?.label ?? "BemorOvozi";

  return (
    <div className="flex min-h-screen w-full bg-[#F7F9F8] md:min-w-0">
      {/* Desktop sidebar */}
      <div className="hidden md:block">
        <SidebarContent staffName={staffName} staffRole={staffRole} />
      </div>

      {/* Mobile off-canvas drawer */}
      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            aria-label="Menyuni yopish"
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
          />
          <div className="relative z-10 h-full w-60 shadow-2xl">
            <SidebarContent staffName={staffName} staffRole={staffRole} onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-grow flex-col">
        {/* Mobile topbar */}
        <div className="flex items-center gap-3 border-b border-gray-200 bg-white px-4 py-3.5 md:hidden">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Menyuni ochish"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-ink"
          >
            <svg viewBox="0 0 24 24" width={22} height={22} fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
            </svg>
          </button>
          <span className="font-heading text-[15px] font-bold text-ink">{activeLabel}</span>
        </div>

        <div className="min-w-0 flex-grow overflow-hidden">{children}</div>
      </div>
    </div>
  );
}
