"use client";

import { useState } from "react";
import { Navbar } from "@/components/marketing/Navbar";
import { Footer } from "@/components/marketing/Footer";
import { Faq } from "@/components/marketing/Faq";
import { LeadForm } from "@/components/marketing/LeadForm";

const TIERS = [
  {
    id: "boshlangich",
    name: "Boshlang'ich",
    subtitle: "Kichik shifoxonalar uchun (≤50 o'rin)",
    features: ["QR-kod va bemor formasi", "Asosiy AI tahlil va yo'naltirish", "1 boshqaruv paneli foydalanuvchisi", "Email orqali qo'llab-quvvatlash"],
  },
  {
    id: "standart",
    name: "Standart",
    subtitle: "O'rta shifoxonalar uchun (50–200 o'rin)",
    recommended: true,
    features: [
      "Boshlang'ichdagi barchasi",
      "Tendensiya va klaster aniqlash",
      "Cheksiz boshqaruv foydalanuvchisi",
      "Bosma QR-karta generatori",
      "Telefon orqali qo'llab-quvvatlash",
    ],
  },
  {
    id: "professional",
    name: "Professional",
    subtitle: "Yirik shifoxona tarmoqlari uchun (200+ o'rin)",
    custom: true,
    features: ["Standartdagi barchasi", "Ko'p filial boshqaruvi", "API integratsiya", "Shaxsiy hisobot va SLA"],
  },
];

const COMPARISON = [
  { label: "Boshqaruv foydalanuvchilari", values: ["1 ta", "Cheksiz", "Cheksiz"] },
  { label: "Klasterlash / tendensiya", values: ["—", "✓", "✓"] },
  { label: "Bosma QR-karta generatori", values: ["—", "✓", "✓"] },
  { label: "API integratsiya", values: ["—", "—", "✓"] },
];

const FAQ_ITEMS = [
  {
    q: "Narx nimalarga bog'liq?",
    a: "B2B narxi shifoxonadagi o'rinlar soniga qarab uch tarifga bo'linadi. B2G uchun narx hududdagi shifoxonalar soni asosida individual kelishiladi.",
  },
  {
    q: "Bepul sinov muddati bormi?",
    a: "Pilot bosqichdagi shifoxonalar uchun boshlang'ich davr bepul sinov sifatida taklif etiladi — shartnoma imzolashdan oldin so'rang.",
  },
  {
    q: "Shartnoma muddati qancha?",
    a: "Standart shartnoma 12 oyga tuziladi, lekin pilot mijozlar uchun qisqaroq muddat ham muhokama qilinishi mumkin.",
  },
];

export default function PricingPage() {
  const [audience, setAudience] = useState<"b2b" | "b2g">("b2b");

  return (
    <>
      <Navbar />
      <main>
        <section className="mx-auto max-w-4xl px-6 pb-10 pt-16 text-center">
          <h1 className="font-heading text-4xl font-extrabold text-ink">Shaffof narxlar — B2B va B2G uchun</h1>
          <p className="mt-3 text-gray-600">Shifoxona kattaligiga mos, oddiy oylik obuna. Yashirin to&apos;lovlarsiz.</p>

          <div className="mx-auto mt-8 inline-flex rounded-full bg-[#F7F9F8] p-1">
            <button
              type="button"
              onClick={() => setAudience("b2b")}
              className="rounded-full px-6 py-2.5 text-sm font-bold"
              style={{ background: audience === "b2b" ? "#FFFFFF" : "transparent", color: audience === "b2b" ? "#0F6E5C" : "#6B7280" }}
            >
              Shifoxonalar (B2B)
            </button>
            <button
              type="button"
              onClick={() => setAudience("b2g")}
              className="rounded-full px-6 py-2.5 text-sm font-bold"
              style={{ background: audience === "b2g" ? "#FFFFFF" : "transparent", color: audience === "b2g" ? "#0F6E5C" : "#6B7280" }}
            >
              Davlat boshqarmalari (B2G)
            </button>
          </div>
        </section>

        {audience === "b2b" ? (
          <>
            <section className="mx-auto max-w-6xl px-6 pb-16">
              <div className="grid gap-6 md:grid-cols-3">
                {TIERS.map((tier) => (
                  <div
                    key={tier.id}
                    className="relative flex flex-col gap-4 rounded-2xl border-[1.5px] p-7"
                    style={{ borderColor: tier.recommended ? "#0F6E5C" : "#E4E7EB" }}
                  >
                    {tier.recommended && (
                      <span className="absolute -top-3 left-7 rounded-full bg-teal px-3 py-1 text-xs font-bold text-white">
                        Tavsiya etiladi
                      </span>
                    )}
                    <div>
                      <h3 className="font-heading text-lg font-bold text-ink">{tier.name}</h3>
                      <p className="mt-1 text-sm text-gray-500">{tier.subtitle}</p>
                    </div>
                    <div className="font-heading text-2xl font-extrabold text-ink">
                      {tier.custom ? "Individual" : <span className="text-base font-semibold text-gray-400">So&apos;rov asosida narx</span>}
                    </div>
                    <ul className="flex flex-col gap-2.5 text-sm text-gray-600">
                      {tier.features.map((f) => (
                        <li key={f} className="flex items-start gap-2">
                          <span className="mt-0.5 text-teal">✓</span>
                          {f}
                        </li>
                      ))}
                    </ul>
                    <a
                      href="#sorov"
                      className="mt-auto rounded-xl py-3 text-center font-heading text-sm font-bold"
                      style={{
                        background: tier.recommended ? "#0F6E5C" : "#F7F9F8",
                        color: tier.recommended ? "#FFFFFF" : "#16181D",
                      }}
                    >
                      {tier.custom ? "Aloqaga chiqish" : "So'rov yuborish"}
                    </a>
                  </div>
                ))}
              </div>
            </section>

            <section className="mx-auto max-w-4xl px-6 pb-16">
              <h2 className="mb-6 text-center font-heading text-xl font-bold text-ink">Xususiyat</h2>
              <div className="overflow-x-auto rounded-2xl border border-gray-200">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 bg-[#F7F9F8] text-left">
                      <th className="p-4 font-semibold text-gray-500">Xususiyat</th>
                      <th className="p-4 font-semibold text-gray-500">Boshlang&apos;ich</th>
                      <th className="p-4 font-semibold text-gray-500">Standart</th>
                      <th className="p-4 font-semibold text-gray-500">Professional</th>
                    </tr>
                  </thead>
                  <tbody>
                    {COMPARISON.map((row) => (
                      <tr key={row.label} className="border-b border-gray-100 last:border-0">
                        <td className="p-4 text-ink">{row.label}</td>
                        {row.values.map((v, i) => (
                          <td key={i} className="p-4 text-ink">
                            {v}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        ) : (
          <section className="mx-auto max-w-3xl px-6 pb-16 text-center">
            <div className="rounded-2xl border border-gray-200 p-10">
              <h2 className="font-heading text-2xl font-extrabold text-ink">
                Viloyat sog&apos;liqni saqlash boshqarmasi uchun B2G agregatsiya paketi
              </h2>
              <p className="mt-3 text-gray-600">
                Hududdagi barcha ulangan shifoxonalarni bitta agregatsiya panelida ko&apos;ring — viloyat bo&apos;yicha
                tendensiyalar, hisobotlar va monitoring standartlariga moslashtirilgan ma&apos;lumotlar.
              </p>
              <ul className="mx-auto mt-6 flex max-w-sm flex-col gap-2.5 text-left text-sm text-gray-600">
                {[
                  "Hududdagi barcha shifoxonalar bo'yicha yagona ko'rinish",
                  "Davriy tendensiya va hisobot eksporti",
                  "Davlat monitoring talablariga moslashtirilgan format",
                ].map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <span className="mt-0.5 text-teal">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <p className="mt-6 font-heading font-bold text-ink">Individual kelishuv</p>
              <a
                href="#sorov"
                className="mt-4 inline-block rounded-xl bg-teal px-7 py-3 font-heading text-sm font-bold text-white"
              >
                Aloqaga chiqish
              </a>
            </div>
            <p className="mt-6 text-xs text-gray-400">Xorazm viloyati — 2026-yilda birinchi pilot bosqich sifatida taklif etiladi.</p>
          </section>
        )}

        <section className="bg-[#F7F9F8] py-20">
          <div className="mx-auto max-w-2xl px-6">
            <h2 className="text-center font-heading text-2xl font-extrabold text-ink">Narxlar bo&apos;yicha savollar</h2>
            <div className="mt-8">
              <Faq items={FAQ_ITEMS} />
            </div>
          </div>
        </section>

        <section id="sorov" className="py-20">
          <div className="mx-auto max-w-xl px-6">
            <h2 className="text-center font-heading text-2xl font-extrabold text-ink">So&apos;rov yuborish</h2>
            <p className="mt-2 text-center text-sm text-gray-500">
              Tarifni tanlab yozing yoki bo&apos;sh qoldiring — biz siz bilan bog&apos;lanib aniqlashtiramiz.
            </p>
            <div className="mt-8">
              <LeadForm source={audience === "b2b" ? "narxlar_b2b" : "narxlar_b2g"} />
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
