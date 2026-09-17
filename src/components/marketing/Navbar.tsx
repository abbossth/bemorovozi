import Link from "next/link";
import { Logo } from "@/components/Logo";

export function Navbar() {
  return (
    <header className="sticky top-0 z-30 border-b border-gray-100 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/">
          <Logo size={30} />
        </Link>
        <nav className="hidden items-center gap-8 md:flex">
          <Link href="/#qanday-ishlaydi" className="text-sm font-medium text-gray-600 hover:text-ink">
            Qanday ishlaydi
          </Link>
          <Link href="/#imkoniyatlar" className="text-sm font-medium text-gray-600 hover:text-ink">
            Imkoniyatlar
          </Link>
          <Link href="/#mahsulot" className="text-sm font-medium text-gray-600 hover:text-ink">
            Mahsulot
          </Link>
          <Link href="/narxlar" className="text-sm font-medium text-gray-600 hover:text-ink">
            Narxlar
          </Link>
        </nav>
        <div className="flex items-center gap-3">
          <Link href="/login" className="hidden text-sm font-semibold text-ink sm:inline">
            Kirish
          </Link>
          <Link
            href="/#demo"
            className="rounded-full bg-teal px-5 py-2.5 text-sm font-bold text-white hover:bg-teal-dark"
          >
            Demo so&apos;rash
          </Link>
        </div>
      </div>
    </header>
  );
}
