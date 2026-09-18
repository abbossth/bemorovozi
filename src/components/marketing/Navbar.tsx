"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/Logo";

export function Navbar() {
  const pathname = usePathname();
  const onPricing = pathname === "/narxlar";

  return (
    <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-[88px] max-w-[1440px] items-center justify-between px-6 lg:px-24">
        <Link href="/">
          <Logo size={34} />
        </Link>
        <nav className="hidden items-center gap-9 md:flex">
          <Link href="/#qanday-ishlaydi" className="text-[15px] font-medium text-gray-600 hover:text-ink">
            Qanday ishlaydi
          </Link>
          <Link href="/#imkoniyatlar" className="text-[15px] font-medium text-gray-600 hover:text-ink">
            Imkoniyatlar
          </Link>
          <Link href="/#mahsulot" className="text-[15px] font-medium text-gray-600 hover:text-ink">
            Mahsulot
          </Link>
          <Link
            href="/narxlar"
            className="text-[15px]"
            style={{ fontWeight: onPricing ? 700 : 500, color: onPricing ? "#0F6E5C" : "#4B5563" }}
          >
            Narxlar
          </Link>
        </nav>
        <div className="flex items-center gap-5">
          <Link href="/login" className="hidden text-[15px] font-semibold text-ink sm:inline">
            Kirish
          </Link>
          <Link href="/#demo" className="rounded-lg bg-teal px-6 py-3 font-heading text-sm font-bold text-white hover:bg-teal-dark">
            Demo so&apos;rash
          </Link>
        </div>
      </div>
    </header>
  );
}
