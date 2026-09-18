import Link from "next/link";
import { Navbar } from "@/components/marketing/Navbar";
import { HeroVideo } from "@/components/marketing/HeroVideo";
import { Faq } from "@/components/marketing/Faq";
import { LeadForm } from "@/components/marketing/LeadForm";
import { LogoMark } from "@/components/Logo";

const STEPS = [
  {
    n: "01",
    title: "QR-kodni skanerlash",
    body: "Bemor palatadagi yoki bo'limdagi QR-kodni telefon kamerasi bilan skanerlaydi — ilova o'rnatish shart emas.",
    icon: (
      <svg viewBox="0 0 24 24" width={28} height={28} fill="none" stroke="#0F6E5C" strokeWidth={1.6}>
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="3" height="3" />
        <rect x="18" y="18" width="3" height="3" />
        <rect x="14" y="18" width="3" height="3" />
        <rect x="18" y="14" width="3" height="3" />
      </svg>
    ),
  },
  {
    n: "02",
    title: "AI darhol tahlil qiladi",
    body: "Xabar matni jiddiylik darajasi bo'yicha baholanadi va tegishli bo'limga avtomatik yo'naltiriladi.",
    icon: (
      <svg viewBox="0 0 24 24" width={26} height={26} fill="#0F6E5C">
        <path d="M12 2l1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8L12 2z" />
      </svg>
    ),
  },
  {
    n: "03",
    title: "Tezkor yechim",
    body: "Mas'ul xodim bildirishnoma oladi, muammoni ko'rib chiqadi va holatni yangilaydi — bemor natijani kuzatishi mumkin.",
    icon: (
      <svg viewBox="0 0 24 24" width={28} height={28} fill="none" stroke="#0F6E5C" strokeWidth={1.8}>
        <circle cx="12" cy="12" r="9" />
        <path d="M8 12.5l2.5 2.5L16 9.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
];

const FEATURES = [
  {
    title: "To'liq anonimlik",
    body: "Bemor ismi so'ralmaydi va saqlanmaydi — faqat bo'lim va vaqt belgisi bilan ishlaymiz.",
    icon: (
      <svg viewBox="0 0 24 24" width={26} height={26} fill="none" stroke="#0F6E5C" strokeWidth={1.8}>
        <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" />
      </svg>
    ),
  },
  {
    title: "AI avtomatik tahlil",
    body: "Har bir xabar jiddiylik darajasi bo'yicha baholanadi va tegishli bo'limga o'zi yo'naltiriladi.",
    icon: (
      <svg viewBox="0 0 24 24" width={26} height={26} fill="#0F6E5C">
        <path d="M12 2l1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8L12 2z" />
      </svg>
    ),
  },
  {
    title: "Real-vaqt boshqaruv paneli",
    body: "Ma'muriyat har bir signalni kelgan zahoti, tartiblangan holda ko'radi va holatini yangilaydi.",
    icon: (
      <svg viewBox="0 0 24 24" width={26} height={26} fill="none" stroke="#0F6E5C" strokeWidth={1.8}>
        <path d="M2 12s3.5-6.5 10-6.5S22 12 22 12s-3.5 6.5-10 6.5S2 12 2 12z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    ),
  },
  {
    title: "Tendensiya va klaster aniqlash",
    body: "Takrorlanuvchi muammolar avtomatik guruhlanadi — tasodifiy shikoyat emas, tizimli signal sifatida ko'rinadi.",
    icon: (
      <svg viewBox="0 0 24 24" width={26} height={26} fill="none" stroke="#0F6E5C" strokeWidth={1.8}>
        <path d="M3 17l5-5 4 4 8-9" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    title: "Ovozli AI suhbat",
    body: "Yozishga qiynaladigan bemorlar AI yordamchi bilan gaplashadi — u savol berib muammoni aniqlaydi va yo'naltiradi.",
    icon: (
      <svg viewBox="0 0 24 24" width={26} height={26} fill="none" stroke="#0F6E5C" strokeWidth={1.8}>
        <path
          d="M12 3v10m0 0l-3.5-3.5M12 13l3.5-3.5M6 17h12a2 2 0 0 1 2 2v1H4v-1a2 2 0 0 1 2-2z"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    title: "Bosma, brendlangan QR-kartalar",
    body: "Har bir bo'lim yoki xona uchun chop etishga tayyor QR-karta bir zumda yaratiladi.",
    icon: (
      <svg viewBox="0 0 24 24" width={26} height={26} fill="none" stroke="#0F6E5C" strokeWidth={1.8}>
        <rect x="4" y="3" width="16" height="18" rx="2" />
        <path d="M8 8h2M8 12h2M8 16h2M14 8h2M14 12h2M14 16h2" strokeLinecap="round" />
      </svg>
    ),
  },
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
    q: "Bemor ma'lumotlari qanday himoyalanadi?",
    a: "Bemor formasi hech qanday shaxsiy ma'lumot so'ramaydi. Ovozli xabarlarda xom audio fayl faqat matnga aylantirish uchun vaqtincha ishlatiladi va darhol o'chiriladi.",
  },
];

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main>
        {/* HERO */}
        <section className="bg-teal-tint px-6 py-16 lg:px-24 lg:py-24">
          <div className="mx-auto grid max-w-[1440px] items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
            <div className="flex max-w-xl flex-col gap-7">
              <span className="w-fit rounded-full border border-[#C9D2CE] bg-white px-3.5 py-1.5 text-[13px] font-bold text-teal">
                Umummilliy AI Xakaton · Xorazm 2026
              </span>
              <h1 className="text-balance font-heading text-4xl font-extrabold leading-[1.12] text-ink sm:text-5xl lg:text-[56px]">
                Bemorning ovozi endi eshitiladi
              </h1>
              <p className="max-w-[500px] text-lg leading-relaxed text-gray-600">
                QR-kod orqali bildirilgan har bir fikr sun&apos;iy intellekt yordamida darhol tahlil qilinadi va
                tegishli bo&apos;limga yo&apos;naltiriladi — bemor kimligini oshkor qilmasdan.
              </p>
              <div className="flex flex-wrap items-center gap-4">
                <Link href="/#demo" className="rounded-[10px] bg-teal px-8 py-4 font-heading text-base font-bold text-white hover:bg-teal-dark">
                  Demo so&apos;rash
                </Link>
                <Link
                  href="/narxlar"
                  className="rounded-[10px] border-[1.5px] border-[#C9D2CE] px-8 py-4 font-heading text-base font-bold text-ink"
                >
                  Narxlarni ko&apos;rish
                </Link>
              </div>
            </div>

            <HeroVideo />
          </div>
        </section>

        {/* STATS */}
        <section className="border-b border-gray-200 bg-white px-6 py-10 lg:px-24">
          <div className="mx-auto grid max-w-[1440px] gap-6 sm:grid-cols-3">
            {[
              ["1 970+", "shifoxona O'zbekistonda"],
              ["83", "shifoxona Xorazm viloyatida"],
              ["Xorazmda birinchi", "pilot loyiha, 2026"],
            ].map(([big, small]) => (
              <div key={big} className="flex items-center gap-4 rounded-[14px] bg-[#F7F9F8] p-4">
                <span className="font-heading text-3xl font-extrabold text-teal sm:text-[36px]">{big}</span>
                <span className="text-sm leading-tight text-gray-500">{small}</span>
              </div>
            ))}
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section id="qanday-ishlaydi" className="bg-white px-6 py-20 lg:px-24 lg:py-[100px]">
          <div className="mx-auto flex max-w-[1440px] flex-col gap-14">
            <div className="flex flex-col items-center gap-3 text-center">
              <h2 className="font-heading text-3xl font-extrabold text-ink sm:text-[34px]">Bu qanday ishlaydi</h2>
              <p className="text-lg text-gray-500">Uch qadam — bemordan ma&apos;muriyatgacha</p>
            </div>
            <div className="grid gap-8 sm:grid-cols-3">
              {STEPS.map((step) => (
                <div key={step.n} className="flex flex-col gap-4 rounded-2xl border border-gray-200 p-8">
                  <div className="flex h-14 w-14 items-center justify-center rounded-[14px] bg-teal-tint">{step.icon}</div>
                  <span className="text-[13px] font-semibold text-gray-400">{step.n}</span>
                  <h3 className="font-heading text-xl font-bold text-ink">{step.title}</h3>
                  <p className="text-[15px] leading-relaxed text-gray-500">{step.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FEATURES */}
        <section id="imkoniyatlar" className="bg-teal-tint px-6 py-20 lg:px-24 lg:py-[100px]">
          <div className="mx-auto flex max-w-[1440px] flex-col gap-14">
            <div className="flex flex-col items-center gap-3 text-center">
              <h2 className="font-heading text-3xl font-extrabold text-ink sm:text-[34px]">
                Nega shifoxonalar BemorOvozini tanlaydi
              </h2>
              <p className="text-lg text-gray-500">
                Bitta tizimda — bemordan tortib ma&apos;muriyatgacha kerak bo&apos;lgan hamma narsa
              </p>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((f) => (
                <div key={f.title} className="flex flex-col gap-3 rounded-2xl bg-white p-7">
                  {f.icon}
                  <h3 className="font-heading text-lg font-bold text-ink">{f.title}</h3>
                  <p className="text-sm leading-relaxed text-gray-500">{f.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* PRODUCT SHOWCASE */}
        <section id="mahsulot" className="bg-white px-6 py-20 lg:px-24 lg:py-[100px]">
          <div className="mx-auto flex max-w-[1440px] flex-col gap-14">
            <div className="flex flex-col items-center gap-3 text-center">
              <h2 className="font-heading text-3xl font-extrabold text-ink sm:text-[34px]">Mahsulotni ko&apos;ring</h2>
              <p className="text-lg text-gray-500">Uch ekran — bitta uzluksiz tizim</p>
            </div>
            <div className="grid gap-7 sm:grid-cols-3">
              <Link href="/login" className="flex flex-col gap-[18px] rounded-[20px] border border-gray-200 bg-[#F7F9F8] p-6">
                <div className="flex h-[170px] gap-2.5 rounded-xl bg-white p-3.5 shadow-[0_12px_24px_rgba(15,23,17,0.08)]">
                  <div className="w-7 shrink-0 rounded-md bg-navy" />
                  <div className="flex flex-grow flex-col gap-2">
                    <div className="flex gap-1.5">
                      <div className="h-[22px] w-[34px] rounded-md bg-teal-tint" />
                      <div className="h-[22px] w-[34px] rounded-md bg-coral-tint" />
                    </div>
                    <div className="flex items-center gap-1.5 rounded-md border border-teal bg-teal-tint px-1.5 py-1">
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-coral" />
                      <span className="h-1 w-[70%] rounded bg-[#C9D2CE]" />
                    </div>
                    <div className="flex items-center gap-1.5 px-1.5 py-1">
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber" />
                      <span className="h-1 w-[55%] rounded bg-gray-200" />
                    </div>
                    <div className="flex items-center gap-1.5 px-1.5 py-1">
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-teal" />
                      <span className="h-1 w-[60%] rounded bg-gray-200" />
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="mb-1 font-heading text-[17px] font-bold text-ink">Boshqaruv paneli</h3>
                  <p className="mb-2 text-sm text-gray-500">Xabarlarni kuzating, filtrlang va boshqaring.</p>
                  <span className="text-sm font-bold text-teal">Ko&apos;rish →</span>
                </div>
              </Link>

              <div className="flex flex-col gap-[18px] rounded-[20px] border border-gray-200 bg-[#F7F9F8] p-6">
                <div className="flex h-[170px] items-center justify-center">
                  <div className="flex h-[150px] w-[110px] flex-col items-center justify-center gap-2 rounded-2xl bg-white p-3.5 shadow-[0_12px_24px_rgba(15,23,17,0.08)]">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-tint">
                      <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="#0F6E5C" strokeWidth={2.2}>
                        <path d="M6 12.5l4 4 8-9" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <span className="h-1.5 w-[70%] rounded bg-gray-200" />
                    <span className="h-1.5 w-1/2 rounded bg-gray-200" />
                    <span className="mt-1 font-heading text-[11px] font-extrabold text-teal">BO-2481</span>
                  </div>
                </div>
                <div>
                  <h3 className="mb-1 font-heading text-[17px] font-bold text-ink">Bemor formasi</h3>
                  <p className="mb-2 text-sm text-gray-500">QR skanerlangach ochiladigan anonim forma.</p>
                </div>
              </div>

              <Link
                href="/dashboard/settings"
                className="flex flex-col gap-[18px] rounded-[20px] border border-gray-200 bg-[#F7F9F8] p-6"
              >
                <div className="flex h-[170px] items-center justify-center">
                  <div className="flex h-[150px] w-[130px] flex-col items-center gap-2 rounded-2xl bg-white p-3.5 shadow-[0_12px_24px_rgba(15,23,17,0.08)]">
                    <LogoMark size={22} />
                    <div className="grid h-[76px] w-[76px] grid-cols-5 gap-0.5 bg-ink p-1.5">
                      {[1, 0, 1, 1, 0, 0, 1, 0, 0, 1, 1, 0, 1, 0, 1, 1, 1, 0, 0, 1, 0, 1, 1, 1, 0].map((v, i) => (
                        <span key={i} className={v ? "bg-ink" : "bg-white"} />
                      ))}
                    </div>
                    <span className="text-center text-[9px] font-bold leading-tight text-gray-600">
                      Takliflar va shikoyatlar uchun
                    </span>
                  </div>
                </div>
                <div>
                  <h3 className="mb-1 font-heading text-[17px] font-bold text-ink">Bosma QR-karta</h3>
                  <p className="mb-2 text-sm text-gray-500">Har bir bo&apos;lim uchun bir zumda yaratiladi.</p>
                  <span className="text-sm font-bold text-teal">Ko&apos;rish →</span>
                </div>
              </Link>
            </div>
          </div>
        </section>

        {/* PRICING TEASER */}
        <section className="bg-teal-tint px-6 py-20 text-center lg:px-24 lg:py-[100px]">
          <div className="mx-auto flex max-w-[1440px] flex-col items-center gap-10">
            <div className="flex flex-col items-center gap-3">
              <h2 className="font-heading text-3xl font-extrabold text-ink sm:text-[34px]">
                B2B va B2G uchun moslashuvchan narxlar
              </h2>
              <p className="text-lg text-gray-500">
                Shifoxona kattaligiga mos oylik obuna. Davlat boshqarmalari uchun individual shartnoma.
              </p>
            </div>
            <div className="grid w-full max-w-[900px] gap-7 sm:grid-cols-2">
              <div className="flex flex-col gap-2.5 rounded-[18px] bg-white p-8 text-left">
                <span className="text-[13px] font-bold text-teal">Shifoxonalar uchun</span>
                <h3 className="font-heading text-2xl font-extrabold text-ink">B2B obuna</h3>
                <p className="text-sm leading-relaxed text-gray-500">
                  O&apos;rinlar soniga mos uch tarif — 990 000 so&apos;mdan boshlab.
                </p>
              </div>
              <div className="flex flex-col gap-2.5 rounded-[18px] bg-white p-8 text-left">
                <span className="text-[13px] font-bold text-teal">Davlat boshqarmalari uchun</span>
                <h3 className="font-heading text-2xl font-extrabold text-ink">B2G shartnoma</h3>
                <p className="text-sm leading-relaxed text-gray-500">Hududiy agregatsiya va monitoring — individual kelishuv asosida.</p>
              </div>
            </div>
            <Link href="/narxlar" className="rounded-[10px] bg-teal px-9 py-4 font-heading text-base font-bold text-white hover:bg-teal-dark">
              Barcha tariflarni ko&apos;rish
            </Link>
          </div>
        </section>

        {/* FAQ */}
        <section className="bg-white px-6 py-20 lg:px-24 lg:py-[100px]">
          <div className="mx-auto flex max-w-[1440px] flex-col gap-10">
            <h2 className="text-center font-heading text-3xl font-extrabold text-ink sm:text-[34px]">
              Ko&apos;p so&apos;raladigan savollar
            </h2>
            <div className="mx-auto w-full max-w-[800px]">
              <Faq items={FAQ_ITEMS} />
            </div>
          </div>
        </section>

        {/* CTA BANNER */}
        <section id="cta" className="bg-navy px-6 py-[88px] text-center lg:px-24">
          <div className="mx-auto flex max-w-[620px] flex-col items-center gap-6">
            <h2 className="font-heading text-[32px] font-extrabold text-white">
              Shifoxonangiz uchun pilot dasturga qo&apos;shiling
            </h2>
            <p className="text-base text-gray-400">Xorazm viloyatida birinchi bosqich pilot mijozlarini qidiramiz.</p>
          </div>
          <div id="demo" className="mx-auto mt-10 max-w-xl rounded-2xl bg-white p-8 text-left">
            <LeadForm source="demo" submitLabel="Bog'lanish" />
          </div>
        </section>

        {/* FOOTER */}
        <footer className="bg-white px-6 py-16 pb-10 lg:px-24">
          <div className="mx-auto flex max-w-[1440px] flex-col gap-10">
            <div className="grid gap-10 sm:grid-cols-[1.4fr_1fr_1fr]">
              <div className="flex max-w-[320px] flex-col gap-3">
                <span className="inline-flex items-center gap-2.5">
                  <LogoMark size={28} />
                  <span className="font-heading text-base font-extrabold text-ink">BemorOvozi</span>
                </span>
                <p className="text-sm leading-relaxed text-gray-500">
                  Har bir ovoz eshitiladi. QR-kod orqali anonim fikr-mulohaza, AI yordamida darhol tahlil.
                </p>
              </div>
              <div className="flex flex-col gap-2.5">
                <span className="text-[13px] font-bold text-gray-400">Mahsulot</span>
                <Link href="/#qanday-ishlaydi" className="text-sm text-gray-600">
                  Qanday ishlaydi
                </Link>
                <Link href="/#imkoniyatlar" className="text-sm text-gray-600">
                  Imkoniyatlar
                </Link>
                <Link href="/narxlar" className="text-sm text-gray-600">
                  Narxlar
                </Link>
              </div>
              <div className="flex flex-col gap-2.5">
                <span className="text-[13px] font-bold text-gray-400">Kompaniya</span>
                <Link href="/login" className="text-sm text-gray-600">
                  Kirish
                </Link>
                <a href="mailto:hello@bemorovozi.uz" className="text-sm text-gray-600">
                  Bog&apos;lanish
                </a>
              </div>
            </div>
            <div className="flex items-center justify-between border-t border-gray-200 pt-6">
              <span className="text-[13px] text-gray-400">© 2026 BemorOvozi</span>
              <a href="mailto:hello@bemorovozi.uz" className="text-[13px] text-gray-400">
                hello@bemorovozi.uz
              </a>
            </div>
          </div>
        </footer>
      </main>
    </>
  );
}
