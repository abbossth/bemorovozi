"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogoMark } from "@/components/Logo";

const NAV = [
  {
    href: "/dashboard",
    label: "Xabarlar",
    icon: (
      <path d="M4 6h16M4 12h16M4 18h10" strokeLinecap="round" />
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

export function DashboardSidebar({ staffName }: { staffName: string }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex w-60 flex-shrink-0 flex-col bg-navy px-5 py-7">
      <div className="mb-10 flex items-center gap-2.5 px-1">
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

      <div className="mt-auto flex flex-col gap-2 px-1">
        <span className="truncate text-xs text-white/50">{staffName}</span>
        <button
          type="button"
          onClick={handleLogout}
          className="self-start text-xs font-semibold text-white/70 hover:text-white"
        >
          Chiqish
        </button>
      </div>
    </div>
  );
}
