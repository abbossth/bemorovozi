"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { firebaseAuth } from "@/lib/firebase/client";
import { LogoMark } from "@/components/Logo";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const credential = await signInWithEmailAndPassword(firebaseAuth, email, password);
      const idToken = await credential.user.getIdToken();
      const res = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Kirishda xatolik yuz berdi");
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error && err.message.includes("shifoxona xodimi")
          ? err.message
          : "Email yoki parol noto'g'ri"
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword() {
    if (!email) {
      setError("Avval elektron pochtangizni kiriting");
      return;
    }
    try {
      await sendPasswordResetEmail(firebaseAuth, email);
      setResetSent(true);
      setError(null);
    } catch {
      setError("Parolni tiklashda xatolik yuz berdi");
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-navy p-6">
      <div className="w-full max-w-[420px] rounded-[20px] bg-white p-10 shadow-[0_40px_80px_rgba(0,0,0,0.35)]">
        <div className="flex flex-col items-center gap-3.5 text-center">
          <LogoMark size={48} />
          <div>
            <h1 className="font-heading text-[22px] font-extrabold text-ink">Boshqaruv paneliga kirish</h1>
            <p className="mt-1.5 text-sm text-gray-500">Faqat ruxsat etilgan shifoxona xodimlari uchun</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-7 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-sm font-semibold text-ink">
              Elektron pochta
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ism.familiya@shifoxona.uz"
              className="w-full rounded-[10px] border border-gray-200 px-3.5 py-3 text-[15px] text-ink outline-none focus:border-teal"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-sm font-semibold text-ink">
              Parol
            </label>
            <div className="relative flex items-center">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-[10px] border border-gray-200 py-3 pl-3.5 pr-11 text-[15px] text-ink outline-none focus:border-teal"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label="Parolni ko'rsatish"
                className="absolute right-2.5 flex p-1 text-gray-500"
              >
                <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="currentColor" strokeWidth={1.8}>
                  <path d="M2 12s3.5-6.5 10-6.5S22 12 22 12s-3.5 6.5-10 6.5S2 12 2 12z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={handleForgotPassword}
            className="self-end text-[13px] font-semibold text-teal"
          >
            Parolni unutdingizmi?
          </button>

          {resetSent && <p className="text-[13px] text-teal">Parolni tiklash havolasi emailingizga yuborildi.</p>}
          {error && <p className="rounded-lg bg-coral-tint px-3 py-2 text-[13px] text-coral">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="mt-1 w-full rounded-[10px] bg-teal py-3.5 font-heading text-base font-bold text-white disabled:opacity-60"
          >
            {loading ? "Kirilmoqda..." : "Kirish"}
          </button>
        </form>

        <p className="mt-7 text-center text-[13px] text-gray-400">
          Hisobingiz yo&apos;qmi?{" "}
          <a href="mailto:hello@bemorovozi.uz" className="font-semibold text-teal">
            Ma&apos;muriyat bilan bog&apos;laning
          </a>
        </p>
      </div>
    </main>
  );
}
