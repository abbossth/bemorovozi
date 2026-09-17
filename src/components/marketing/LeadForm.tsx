"use client";

import { useState } from "react";

type Props = {
  source: "demo" | "narxlar_b2b" | "narxlar_b2g" | "pilot";
  plan?: string;
  submitLabel?: string;
};

export function LeadForm({ source, plan, submitLabel = "So'rov yuborish" }: Props) {
  const [form, setForm] = useState({ organizationName: "", contactName: "", phone: "", email: "", message: "" });
  const [status, setStatus] = useState<"idle" | "submitting" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("submitting");
    setError(null);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, source, plan }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Xatolik yuz berdi");
      setStatus("sent");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xatolik yuz berdi");
      setStatus("error");
    }
  }

  if (status === "sent") {
    return (
      <div className="rounded-2xl bg-teal-tint p-6 text-center">
        <p className="font-heading font-bold text-teal">Rahmat! So&apos;rovingiz qabul qilindi.</p>
        <p className="mt-1 text-sm text-gray-600">Jamoamiz tez orada siz bilan bog&apos;lanadi.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <input
          required
          placeholder="Shifoxona / tashkilot nomi"
          value={form.organizationName}
          onChange={(e) => setForm({ ...form, organizationName: e.target.value })}
          className="rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-teal"
        />
        <input
          required
          placeholder="Ismingiz"
          value={form.contactName}
          onChange={(e) => setForm({ ...form, contactName: e.target.value })}
          className="rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-teal"
        />
        <input
          required
          type="tel"
          placeholder="Telefon raqam"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          className="rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-teal"
        />
        <input
          type="email"
          placeholder="Email (ixtiyoriy)"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          className="rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-teal"
        />
      </div>
      <textarea
        placeholder="Qo'shimcha izoh (ixtiyoriy)"
        value={form.message}
        onChange={(e) => setForm({ ...form, message: e.target.value })}
        className="min-h-20 resize-none rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-teal"
      />
      {error && <p className="rounded-lg bg-coral-tint px-3 py-2 text-[13px] text-coral">{error}</p>}
      <button
        type="submit"
        disabled={status === "submitting"}
        className="rounded-xl bg-teal px-6 py-3 font-heading text-sm font-bold text-white disabled:opacity-60"
      >
        {status === "submitting" ? "Yuborilmoqda..." : submitLabel}
      </button>
    </form>
  );
}
