import { Logo } from "@/components/Logo";

export function Footer() {
  return (
    <footer className="border-t border-gray-100 bg-[#F7F9F8] py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-6 text-center">
        <Logo size={26} />
        <p className="text-sm text-gray-500">© 2026 BemorOvozi</p>
        <a href="mailto:hello@bemorovozi.uz" className="text-sm font-semibold text-teal">
          hello@bemorovozi.uz
        </a>
      </div>
    </footer>
  );
}
