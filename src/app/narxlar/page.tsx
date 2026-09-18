"use client";

import { useState } from "react";
import Link from "next/link";
import { Navbar } from "@/components/marketing/Navbar";
import { Faq } from "@/components/marketing/Faq";
import { LeadForm } from "@/components/marketing/LeadForm";
import { LogoMark } from "@/components/Logo";

function CheckIcon({ color = "#0F6E5C" }: { color?: string }) {
  return (
    <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke={color} strokeWidth={2} className="mt-0.5 shrink-0">
      <path d="M5 12.5l4 4 10-11" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const TIERS = [
  {
    id: "boshlangich",
    name: "Boshlang'ich",
    subtitle: "Kichik shifoxonalar uchun (≤50 o'rin)",
    price: "990 000",
    features: [
      "QR-kod va bemor formasi",
      "Asosiy AI tahlil va yo'naltirish",
      "1 boshqaruv paneli foydalanuvchisi",
      "Email orqali qo'llab-quvvatlash",
    ],
  },
  {
    id: "standart",
    name: "Standart",
    subtitle: "O'rta shifoxonalar uchun (50–200 o'rin)",
    price: "1 790 000",
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
    price: "3 490 000",
    features: ["Standartdagi barchasi", "Ko'p filial boshqaruvi", "API integratsiya", "Shaxsiy hisobot va SLA"],
  },
];

const COMPARISON = [
  { label: "Boshqaruv foydalanuvchilari", values: ["1 ta", "Cheksiz", "Cheksiz"] },
  { label: "Klasterlash / tendensiya", values: [false, true, true] },
  { label: "Bosma QR-karta generatori", values: [false, true, true] },
  { label: "API integratsiya", values: [false, false, true] },
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
        <section className="px-6 pb-12 pt-20 text-center lg:px-24">
          <div className="mx-auto flex max-w-[1440px] flex-col items-center gap-4">
            <h1 className="font-heading text-4xl font-extrabold text-ink sm:text-[44px]">
              Shaffof narxlar — B2B va B2G uchun
            </h1>
            <p className="max-w-xl text-lg text-gray-500">
              Shifoxona kattaligiga mos, oddiy oylik obuna. Yashirin to&apos;lovlarsiz.
            </p>
          </div>
        </section>

        <section className="flex justify-center px-6 pb-12 lg:px-24">
          <div className="inline-flex rounded-full border border-gray-200 bg-[#F7F9F8] p-1">
            <button
              type="button"
              onClick={() => setAudience("b2b")}
              className="rounded-full px-7 py-3 font-heading text-[15px] font-bold"
              style={{ background: audience === "b2b" ? "#0F6E5C" : "transparent", color: audience === "b2b" ? "#FFFFFF" : "#4B5563" }}
            >
              Shifoxonalar (B2B)
            </button>
            <button
              type="button"
              onClick={() => setAudience("b2g")}
              className="rounded-full px-7 py-3 font-heading text-[15px] font-bold"
              style={{ background: audience === "b2g" ? "#0F6E5C" : "transparent", color: audience === "b2g" ? "#FFFFFF" : "#4B5563" }}
            >
              Davlat boshqarmalari (B2G)
            </button>
          </div>
        </section>

        {audience === "b2b" ? (
          <>
            <section className="px-6 pb-20 lg:px-24">
              <div className="mx-auto grid max-w-[1440px] gap-7 md:grid-cols-3">
                {TIERS.map((tier) => (
                  <div
                    key={tier.id}
                    className="relative flex flex-col gap-5 rounded-[20px] p-9"
                    style={{
                      border: tier.recommended ? "2px solid #0F6E5C" : "1px solid #E4E7EB",
                      background: tier.recommended ? "#EAF5F2" : "#FFFFFF",
                    }}
                  >
                    {tier.recommended && (
                      <span className="absolute -top-3.5 left-9 rounded-full bg-teal px-3.5 py-1.5 text-xs font-bold text-white">
                        Tavsiya etiladi
                      </span>
                    )}
                    <div>
                      <h3 className="mb-1.5 font-heading text-[22px] font-extrabold text-ink">{tier.name}</h3>
                      <p className="text-sm" style={{ color: tier.recommended ? "#4B5563" : "#6B7280" }}>
                        {tier.subtitle}
                      </p>
                    </div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="font-heading text-[34px] font-extrabold text-ink">{tier.price}</span>
                      <span className="text-[15px]" style={{ color: tier.recommended ? "#4B5563" : "#6B7280" }}>
                        so&apos;m / oy
                      </span>
                    </div>
                    <a
                      href="#sorov"
                      className="rounded-[10px] py-3.5 text-center font-heading text-[15px] font-bold"
                      style={
                        tier.recommended
                          ? { background: "#0F6E5C", color: "#FFFFFF" }
                          : { background: "#F7F9F8", color: "#16181D", border: "1px solid #E4E7EB" }
                      }
                    >
                      So&apos;rov yuborish
                    </a>
                    <div
                      className="flex flex-col gap-3 pt-3"
                      style={{ borderTop: `1px solid ${tier.recommended ? "#C9D2CE" : "#E4E7EB"}` }}
                    >
                      {tier.features.map((f) => (
                        <div key={f} className="flex items-start gap-2.5">
                          <CheckIcon />
                          <span className="text-sm" style={{ color: tier.recommended ? "#16181D" : "#4B5563" }}>
                            {f}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="px-6 pb-20 lg:px-24">
              <div className="mx-auto max-w-4xl overflow-hidden overflow-x-auto rounded-2xl border border-gray-200">
                <table className="w-full min-w-[560px] text-sm">
                  <thead>
                    <tr className="bg-[#F7F9F8] text-left">
                      <th className="p-4 text-[13px] font-bold text-gray-500">Xususiyat</th>
                      <th className="p-4 text-center text-[13px] font-bold text-gray-500">Boshlang&apos;ich</th>
                      <th className="p-4 text-center text-[13px] font-bold text-teal">Standart</th>
                      <th className="p-4 text-center text-[13px] font-bold text-gray-500">Professional</th>
                    </tr>
                  </thead>
                  <tbody>
                    {COMPARISON.map((row) => (
                      <tr key={row.label} className="border-t border-gray-200">
                        <td className="p-4 text-ink">{row.label}</td>
                        {row.values.map((v, i) => (
                          <td key={i} className="p-4 text-center text-gray-600">
                            {typeof v === "boolean" ? (
                              v ? (
                                <CheckIcon />
                              ) : (
                                <span className="text-gray-300">—</span>
                              )
                            ) : (
                              v
                            )}
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
          <section className="px-6 pb-20 lg:px-24">
            <div className="mx-auto flex max-w-3xl justify-center">
              <div className="w-full rounded-3xl border-2 border-teal bg-teal-tint p-10 sm:p-12">
                <span className="text-[13px] font-bold text-teal">Viloyat sog&apos;liqni saqlash boshqarmasi uchun</span>
                <h3 className="mt-2 font-heading text-[28px] font-extrabold text-ink">B2G agregatsiya paketi</h3>
                <p className="mt-4 text-base leading-relaxed text-ink">
                  Hududdagi barcha ulangan shifoxonalarni bitta agregatsiya panelida ko&apos;ring — viloyat
                  bo&apos;yicha tendensiyalar, hisobotlar va monitoring standartlariga moslashtirilgan ma&apos;lumotlar.
                </p>
                <div className="mt-6 flex flex-col gap-3">
                  {[
                    "Hududdagi barcha shifoxonalar bo'yicha yagona ko'rinish",
                    "Davriy tendensiya va hisobot eksporti",
                    "Davlat monitoring talablariga moslashtirilgan format",
                  ].map((f) => (
                    <div key={f} className="flex items-start gap-2.5">
                      <CheckIcon />
                      <span className="text-[15px] text-ink">{f}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-6 flex flex-col items-center gap-4 border-t border-[#C9D2CE] pt-5 sm:flex-row sm:justify-between">
                  <span className="font-heading text-2xl font-extrabold text-ink">Individual kelishuv</span>
                  <a href="#sorov" className="rounded-[10px] bg-teal px-7 py-3.5 font-heading text-[15px] font-bold text-white">
                    Aloqaga chiqish
                  </a>
                </div>
                <p className="mt-5 text-[13px] text-gray-600">
                  Xorazm viloyati — 2026-yilda birinchi pilot bosqich sifatida taklif etiladi.
                </p>
              </div>
            </div>
          </section>
        )}

        <section className="bg-[#F7F9F8] px-6 py-20 lg:px-24">
          <div className="mx-auto flex max-w-[1440px] flex-col gap-10">
            <h2 className="text-center font-heading text-[30px] font-extrabold text-ink">Narxlar bo&apos;yicha savollar</h2>
            <div className="mx-auto w-full max-w-[800px]">
              <Faq items={FAQ_ITEMS} />
            </div>
          </div>
        </section>

        <section id="sorov" className="px-6 py-20 lg:px-24">
          <div className="mx-auto max-w-xl">
            <h2 className="text-center font-heading text-2xl font-extrabold text-ink">So&apos;rov yuborish</h2>
            <p className="mt-2 text-center text-sm text-gray-500">
              Tarifni tanlab yozing yoki bo&apos;sh qoldiring — biz siz bilan bog&apos;lanib aniqlashtiramiz.
            </p>
            <div className="mt-8">
              <LeadForm source={audience === "b2b" ? "narxlar_b2b" : "narxlar_b2g"} />
            </div>
          </div>
        </section>

        <footer className="flex items-center justify-between border-t border-gray-200 px-6 py-10 lg:px-24">
          <span className="inline-flex items-center gap-2.5">
            <LogoMark size={24} />
            <span className="text-sm text-gray-500">© 2026 BemorOvozi</span>
          </span>
          <Link href="mailto:hello@bemorovozi.uz" className="text-[13px] text-gray-400">
            hello@bemorovozi.uz
          </Link>
        </footer>
      </main>
    </>
  );
}
