import type { ClassificationInput } from "./types";

// Hard clinical-safety rules for severity classification. These exist because
// leaving severity entirely to the model's free judgment let surface-level
// "scariness" of wording outrank actual clinical risk — e.g. a calmly-phrased
// medication mix-up ("boshqa bemorga mo'ljallangan dori berildi") landed on
// "orta" while a dramatically-worded but comparatively contained incident
// landed on "yuqori". Medication/patient-identity errors are textbook
// hospital "never events" — they must always classify as "yuqori" regardless
// of tone, and that has to be a explicit, non-negotiable instruction rather
// than left for the model to infer.
const SEVERITY_SAFETY_RULES = `MUHIM XAVFSIZLIK QOIDALARI — quyidagilar HAR DOIM "yuqori" jiddiylik hisoblanadi. Xabar qanchalik "yumshoq" yoki oddiy ohangda yozilgan bo'lishidan qat'i nazar, bu holatlar uchun "orta" yoki "past" tanlash TAQIQLANADI:
1. Dori bilan bog'liq har qanday xato: noto'g'ri dori berilishi, noto'g'ri doza, boshqa bemorga mo'ljallangan dorini berish, ma'lum allergiyaga qaramay dori berish, hayotiy zarur dorini bermaslik yoki sezilarli kechiktirish.
2. Bemor yoki muolajani almashtirib yuborish — noto'g'ri bemorga protsedura, operatsiya, in'eksiya yoki tahlil qilish.
3. Hayotiy xavfli holatlar (hushidan ketish, nafas qisilishi, yurak muammosi, kuchli qon ketishi, tomirga havo yuborilishi va h.k.) va bunga xodimlarning sezilarli darajada javob bermasligi.
4. Tibbiy protsedura paytidagi jiddiy texnik xato (noto'g'ri joyga in'eksiya, sterilizatsiya qoidabuzarligi natijasida infeksiya xavfi).

Bu ro'yxatdagi biror holat xabarda tilga olinsa, ustunlik shu qoidada — boshqa hech qanday kontekst (masalan xabarning umumiy ohangi yoki qisqaligi) buni pasaytira olmaydi. Ushbu ro'yxatga kirmagan, lekin haqiqatan ham og'ir oqibatli boshqa klinik xatolar uchun ham xuddi shunday "yuqori" deb baholang.`;

export function buildClassificationPrompt(input: ClassificationInput) {
  return `Siz o'zbekiston shifoxonasidagi bemorlar fikr-mulohazasini tahlil qiluvchi yordamchisiz.
Quyidagi bemor xabarini tahlil qiling va uni tasniflang.

${SEVERITY_SAFETY_RULES}

Yuqoridagi ro'yxatga kirmagan holatlar uchun mezon: "past" — juda engil, bir martalik noqulaylik (masalan xona harorati, taom ta'mi); "orta" — bemorning qulayligi yoki xizmat sifatiga sezilarli ta'sir qiladi (masalan juda uzoq navbat, xodimning beparvoligi, hujjatlar bilan muammo), lekin darhol hayotiy xavf yo'q; "yuqori" — yuqoridagi ro'yxatdagi holatlar yoki ularga teng darajadagi jiddiy xavf.

Bemor bo'limi tanlagan: "${input.departmentName}"
Mavjud bo'limlar ro'yxati: ${input.availableDepartments.join(", ")}

Bemor xabari:
"""
${input.transcript}
"""

Javobni faqat quyidagi JSON formatda qaytaring:
- severity: "past", "orta", yoki "yuqori" — yuqoridagi qoidalarga qat'iy amal qiling
- summary: xabarning bir yoki ikki jumlali xolis, qisqa o'zbekcha xulosasi
- suggestedDepartment: mavjud bo'limlar ro'yxatidan eng mos keladigan bo'lim nomi
- issueTag: muammoning snake_case formatidagi qisqa lotin-o'zbekcha kodi (masalan "dori_vaqtida_berilmadi"), o'xshash xabarlarni guruhlash uchun ishlatiladi`;
}
