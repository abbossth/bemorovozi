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
- **Suhbat motori**: bemor bilan suhbat **bitta** state machine'da (`src/lib/conversation`),
  matn ham, ovoz ham shuni ishlatadi. Gemini (`gemini-3.6-flash`, structured output) faqat
  maydonlarni ajratadi va javob matnini yozadi; bosqichlar, savollar chegarasi (max 3) va
  tasdiqlash serverda kod bilan boshqariladi
- **Ovoz**: STT/TTS qatlami (`src/lib/voice`) — **NeuronAI** asosiy (`VOICE_PROVIDER`),
  ishlamasa yoki balansi tugasa **VoiceLab**'ga avtomatik o'tadi. Ovoz suhbat mantig'iga
  qo'shilmaydi: STT matn beradi, motorning matn javobi TTS bilan o'qiladi
- **Bildirishnomalar**: xodim paneli **Web Push** (service worker + VAPID) orqali yangi
  xabarni operatsion tizim bildirishnomasi qilib yuboradi — boshqa ilova ustida ishlayotgan
  yoki tab yopiq bo'lsa ham keladi. Ikki qatlam: web push (tab yopiq bo'lsa ham) va
  lokal (panel tabi orqada ochiq turganda o'zi yangi xabarni topib ko'rsatadi — brauzerning
  push kanali ishlamasa ham). Ruxsat panelda tugma bosilganda so'raladi
  (`PushNotificationBanner`, Sozlamalar). Telegram bilan parallel ishlaydi
  (`src/lib/push`, `public/sw.js`)
- **QR + PDF**: `qrcode` + `@react-pdf/renderer`
- **Telegram**: ikkita bot (grammY) — xodim bildirishnoma boti va anonim bemor
  boti, ikkalasi ham `src/lib/createFeedback.ts`dagi bitta pipeline'ni ishlatadi

## Ishga tushirish

```bash
npm install
npm run dev
```

`.env.local` allaqachon barcha kalitlar bilan to'ldirilgan (MongoDB, Gemini, Firebase
web config + Admin SDK, VoiceLab). Ixtiyoriy qolgan narsa:

- `ANTHROPIC_API_KEY` — agar Claude'ga o'tmoqchi bo'lsangiz (`AI_PROVIDER=anthropic`)
- `CONVERSATION_SECRET` — suhbat holati tokenini imzolaydi (`openssl rand -hex 32`)
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` — panel bildirishnomalari
  uchun (`npx web-push generate-vapid-keys`); public kalit build vaqtida kerak

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
npm run test    # Vitest — suhbat motori, holat tokeni, ovoz VAD/failover, retry, tracking code
# Gemini prompt sifati (haqiqiy API, kvota sarflaydi):
LIVE_GEMINI=1 node --env-file=.env.local node_modules/.bin/vitest run src/lib/conversation/live.eval.test.ts
npm run lint    # ESLint
npx tsc --noEmit
npm run build   # production build
```

## Papka tuzilishi

- `src/app/f/[hospitalId]/[departmentId]` — bemor formasi (autentifikatsiyasiz)
- `src/app/dashboard` — xodimlar paneli (Firebase Auth talab qilinadi)
- `src/app/(marketing)` (`/`, `/narxlar`) — bosh sahifa va narxlar
- `src/lib/ai` — provayderdan mustaqil AI qatlami (Gemini/Anthropic)
- `src/lib/voice` — STT/TTS qatlami, VoiceLab → NeuronAI avtomatik fallback bilan
- `src/lib/conversation` — suhbat motori: `engine.ts` (state machine), `model.ts` (Gemini),
  `token.ts` (imzolangan holat), `finalize.ts` (tasdiqlangach yuborish)
- `src/components/patient` — `ConversationView` (matn va ovoz uchun umumiy chat),
  `TextComposer`, `VoiceControls` (mikrofon/orb, STT/TTS)
- `src/lib/createFeedback.ts` — yagona feedback-yaratish pipeline (web forma +
  ikkala Telegram bot shu bittasini chaqiradi)
- `src/lib/telegram` — ikkala botning grammY logikasi (`staffBot.ts`,
  `patientBot.ts`, `notifyStaff.ts`)
- `src/app/api/telegram` — webhook route'lar, staff link-token API, digest cron
- `src/models` — Mongoose sxemalari (Hospital, Department, Staff, Feedback, Lead,
  TelegramLinkToken, TelegramNotification)
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
