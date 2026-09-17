import Link from "next/link";
import { Navbar } from "@/components/marketing/Navbar";
import { Footer } from "@/components/marketing/Footer";
import { Faq } from "@/components/marketing/Faq";
import { LeadForm } from "@/components/marketing/LeadForm";

const STEPS = [
  {
    n: "01",
    title: "QR-kodni skanerlash",
    body: "Bemor palatadagi yoki bo'limdagi QR-kodni telefon kamerasi bilan skanerlaydi — ilova o'rnatish shart emas.",
  },
  {
    n: "02",
    title: "AI darhol tahlil qiladi",
    body: "Xabar matni jiddiylik darajasi bo'yicha baholanadi va tegishli bo'limga avtomatik yo'naltiriladi.",
  },
  {
    n: "03",
    title: "Tezkor yechim",
    body: "Mas'ul xodim bildirishnoma oladi, muammoni ko'rib chiqadi va holatni yangilaydi — bemor natijani kuzatishi mumkin.",
  },
];

const FEATURES = [
  { title: "To'liq anonimlik", body: "Bemor ismi so'ralmaydi va saqlanmaydi — faqat bo'lim va vaqt belgisi bilan ishlaymiz." },
  { title: "AI avtomatik tahlil", body: "Har bir xabar jiddiylik darajasi bo'yicha baholanadi va tegishli bo'limga o'zi yo'naltiriladi." },
  { title: "Real-vaqt boshqaruv paneli", body: "Ma'muriyat har bir signalni kelgan zahoti, tartiblangan holda ko'radi va holatini yangilaydi." },
  { title: "Tendensiya va klaster aniqlash", body: "Takrorlanuvchi muammolar avtomatik guruhlanadi — tasodifiy shikoyat emas, tizimli signal sifatida ko'rinadi." },
  { title: "Ovozli AI suhbat", body: "Yozishga qiynaladigan bemorlar AI yordamchi bilan gaplashadi — u savol berib muammoni aniqlaydi va yo'naltiradi." },
  { title: "Bosma, brendlangan QR-kartalar", body: "Har bir bo'lim yoki xona uchun chop etishga tayyor QR-karta bir zumda yaratiladi." },
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
        <section className="mx-auto flex max-w-4xl flex-col items-center gap-6 px-6 pb-16 pt-16 text-center sm:pt-24">
          <span className="rounded-full bg-teal-tint px-4 py-1.5 text-xs font-bold text-teal">
            Umummilliy AI Xakaton · Xorazm 2026
          </span>
          <h1 className="font-heading text-4xl font-extrabold leading-tight text-ink sm:text-5xl">
            Bemorning ovozi endi eshitiladi
          </h1>
          <p className="max-w-2xl text-lg leading-relaxed text-gray-600">
            QR-kod orqali bildirilgan har bir fikr sun&apos;iy intellekt yordamida darhol tahlil qilinadi va tegishli
            bo&apos;limga yo&apos;naltiriladi — bemor kimligini oshkor qilmasdan.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <a href="#demo" className="rounded-full bg-teal px-7 py-3.5 font-heading text-sm font-bold text-white hover:bg-teal-dark">
              Demo so&apos;rash
            </a>
            <Link
              href="/narxlar"
              className="rounded-full border-[1.5px] border-gray-200 px-7 py-3.5 font-heading text-sm font-bold text-ink"
            >
              Narxlarni ko&apos;rish
            </Link>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-3">
            {[
              ["15 soniyalik", "namoyish"],
              ["970+ shifoxona", "O'zbekistonda"],
              ["83 shifoxona", "Xorazm viloyatida"],
            ].map(([big, small]) => (
              <div key={big} className="flex flex-col items-center gap-0.5">
                <span className="font-heading text-xl font-extrabold text-ink">{big}</span>
                <span className="text-xs text-gray-500">{small}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400">Xorazmda birinchi pilot loyiha, 2026</p>
        </section>

        <section id="qanday-ishlaydi" className="bg-[#F7F9F8] py-20">
          <div className="mx-auto max-w-5xl px-6">
            <h2 className="text-center font-heading text-3xl font-extrabold text-ink">Bu qanday ishlaydi</h2>
            <p className="mt-2 text-center text-gray-500">Uch qadam — bemordan ma&apos;muriyatgacha</p>
            <div className="mt-12 grid gap-8 sm:grid-cols-3">
              {STEPS.map((step) => (
                <div key={step.n} className="flex flex-col gap-3">
                  <span className="font-heading text-3xl font-extrabold text-teal/30">{step.n}</span>
                  <h3 className="font-heading text-lg font-bold text-ink">{step.title}</h3>
                  <p className="text-sm leading-relaxed text-gray-600">{step.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="imkoniyatlar" className="py-20">
          <div className="mx-auto max-w-5xl px-6">
            <h2 className="text-center font-heading text-3xl font-extrabold text-ink">Nega shifoxonalar BemorOvozini tanlaydi</h2>
            <p className="mt-2 text-center text-gray-500">
              Bitta tizimda — bemordan tortib ma&apos;muriyatgacha kerak bo&apos;lgan hamma narsa
            </p>
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((f) => (
                <div key={f.title} className="rounded-2xl border border-gray-200 p-6">
                  <h3 className="font-heading text-base font-bold text-ink">{f.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-gray-600">{f.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="mahsulot" className="bg-[#F7F9F8] py-20">
          <div className="mx-auto max-w-5xl px-6">
            <h2 className="text-center font-heading text-3xl font-extrabold text-ink">Uch ekran — bitta uzluksiz tizim</h2>
            <div className="mt-12 grid gap-6 sm:grid-cols-3">
              <div className="rounded-2xl border border-gray-200 bg-white p-6">
                <h3 className="font-heading font-bold text-ink">Boshqaruv paneli</h3>
                <p className="mt-2 text-sm text-gray-600">Xabarlarni kuzating, filtrlang va boshqaring.</p>
                <Link href="/login" className="mt-4 inline-block text-sm font-semibold text-teal">
                  Ko&apos;rish →
                </Link>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-white p-6">
                <h3 className="font-heading font-bold text-ink">Bemor formasi</h3>
                <p className="mt-2 text-sm text-gray-600">QR skanerlangach ochiladigan anonim forma.</p>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-white p-6">
                <h3 className="font-heading font-bold text-ink">Bosma QR-karta</h3>
                <p className="mt-2 text-sm text-gray-600">Har bir bo&apos;lim uchun bir zumda yaratiladi.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-20">
          <div className="mx-auto max-w-3xl px-6 text-center">
            <h2 className="font-heading text-3xl font-extrabold text-ink">B2B va B2G uchun moslashuvchan narxlar</h2>
            <p className="mt-3 text-gray-600">
              Shifoxona kattaligiga mos oylik obuna. Davlat boshqarmalari uchun individual shartnoma.
            </p>
            <Link
              href="/narxlar"
              className="mt-6 inline-block rounded-full bg-teal px-7 py-3.5 font-heading text-sm font-bold text-white hover:bg-teal-dark"
            >
              Barcha tariflarni ko&apos;rish
            </Link>
          </div>
        </section>

        <section className="bg-[#F7F9F8] py-20">
          <div className="mx-auto max-w-2xl px-6">
            <h2 className="text-center font-heading text-3xl font-extrabold text-ink">Ko&apos;p so&apos;raladigan savollar</h2>
            <div className="mt-10">
              <Faq items={FAQ_ITEMS} />
            </div>
          </div>
        </section>

        <section id="demo" className="py-20">
          <div className="mx-auto max-w-xl px-6">
            <h2 className="text-center font-heading text-2xl font-extrabold text-ink">
              Shifoxonangiz uchun pilot dasturga qo&apos;shiling
            </h2>
            <p className="mt-2 text-center text-sm text-gray-500">Xorazm viloyati shifoxonalari uchun ustuvor joylashtirish.</p>
            <div className="mt-8">
              <LeadForm source="demo" />
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
