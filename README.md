# BemorOvozi

Shifoxonalarda bemorlarning fikr-mulohaza va shikoyatlarini QR-kod orqali to'liq anonim
tarzda yig'ib, sun'iy intellekt yordamida tahlil qiluvchi va tegishli bo'limga
yo'naltiruvchi platforma. Umummilliy AI Xakaton (Xorazm, 2026) uchun.

## Stack

- **Next.js 16** (App Router) + TypeScript + Tailwind v4
- **MongoDB Atlas** (Mongoose)
- **Firebase Auth** — faqat shifoxona xodimlari uchun (`/dashboard`); bemor tomonida
  hech qanday autentifikatsiya yo'q
- **AI**: swappable provider (`src/lib/ai`) — hozircha **Gemini**
  (`gemini-3.6-flash`) ulangan; `AI_PROVIDER=anthropic` + `ANTHROPIC_API_KEY`
  qo'yilsa, kod o'zgarishsiz Claude'ga o'tadi
- **Aisha AI** (aisha.group) — ovozli suhbat rejimi uchun STT/TTS (`src/lib/aisha.ts`,
  `AISHA_API_KEY` kelgach ishga tushadi)
- **QR + PDF**: `qrcode` + `@react-pdf/renderer`

## Ishga tushirish

```bash
npm install
npm run dev
```

`.env.local` allaqachon mavjud kalitlar bilan to'ldirilgan (MongoDB, Gemini, Firebase
web config). Hali kerak bo'lganlar:

- `FIREBASE_PROJECT_ID` / `FIREBASE_CLIENT_EMAIL` / `FIREBASE_PRIVATE_KEY` — Firebase
  Console > Project Settings > Service accounts > Generate new private key
- `AISHA_API_KEY` — aisha.group hisobingizdan
- `ANTHROPIC_API_KEY` — agar Claude'ga o'tmoqchi bo'lsangiz

To'liq ro'yxat uchun `.env.example`ga qarang.

## Boshlang'ich ma'lumot va xodim yaratish

```bash
# Bitta hospital + 3 ta bo'lim yaratadi, /f/... havolalarini chop etadi
npm run seed

# Firebase Auth foydalanuvchisini (Console orqali yaratilgan) MongoDB Staff bilan bog'laydi
node --env-file=.env.local scripts/create-staff.mjs ism@shifoxona.uz "Ism Familiya"
```

Login qilish uchun avval Firebase Console > Authentication'da foydalanuvchi (email +
parol) yaratish kerak — o'zi ro'yxatdan o'tish yo'q (spetsifikatsiya talabi).

## Testlar

```bash
npm run test    # Vitest — retry/backoff, tracking code, AI tag normalizatsiyasi
npm run lint    # ESLint
npx tsc --noEmit
npm run build   # production build
```

## Papka tuzilishi

- `src/app/f/[hospitalId]/[departmentId]` — bemor formasi (autentifikatsiyasiz)
- `src/app/dashboard` — xodimlar paneli (Firebase Auth talab qilinadi)
- `src/app/(marketing)` (`/`, `/narxlar`) — bosh sahifa va narxlar
- `src/lib/ai` — provayderdan mustaqil AI qatlami (Gemini/Anthropic)
- `src/lib/aisha.ts` — Aisha AI STT/TTS wrapper
- `src/models` — Mongoose sxemalari (Hospital, Department, Staff, Feedback, Lead)
- `scripts/` — seed va staff-yaratish skriptlari

## Loyihaviy qarorlar (nima uchun)

- **Klasterlash**: alohida vektor-DB o'rniga, Gemini har bir xabarga qisqa
  `issueTag` (masalan `dori_vaqtida_berilmadi`) beradi; dashboard bir xil tag +
  bo'lim bo'yicha 14 kunlik oynada 3+ xabarni "tizimli muammo" deb belgilaydi.
  Oddiy, tez va tushunarli — embedding pipeline shart emas.
- **Real-vaqt**: MongoDB Change Streams o'rniga SWR polling (15s) — Atlas'ning
  har qanday tarifida ishlaydi, qo'shimcha infratuzilma talab qilmaydi.
- **To'lov**: Narxlar sahifasi faqat lead-capture (`So'rov yuborish` /
  `Aloqaga chiqish`) — dizaynga va spetsifikatsiyaga mos, checkout yo'q.
- **AI xatolarga chidamlilik**: `withRetry` 503/429 kabi vaqtinchalik xatolarni
  backoff bilan qayta uradi; agar baribir muvaffaqiyatsiz bo'lsa, xabar "o'rta"
  jiddiylik bilan saqlanadi — bemor hech qachon xabarini yo'qotmaydi.
- **Audio saqlanmaydi**: `/api/voice/stt` audio baytlarini faqat so'rov davomida
  xotirada ushlaydi, diskka yoki DB'ga yozmaydi — javob qaytgach yo'qoladi.
