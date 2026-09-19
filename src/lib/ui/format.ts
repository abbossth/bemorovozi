/** "Malika Aliyeva" → "Malika A." (a lone name stays as it is). */
export function shortName(fullName: string) {
  const [first, ...rest] = fullName.trim().split(/\s+/);
  const initial = rest[0]?.[0];
  return initial ? `${first} ${initial.toUpperCase()}.` : first ?? "";
}

/** "dori_vaqtida_berilmadi" → "Dori vaqtida berilmadi" */
export function humanizeTag(tag: string) {
  const text = tag.replace(/_+/g, " ").trim();
  return text ? text[0].toUpperCase() + text.slice(1) : tag;
}

// Dates are formatted by hand: `toLocaleDateString("uz-UZ")` is not reliable across browsers — Chrome
// (and others) answer "M09 19" instead of "19-sentabr" because they lack Uzbek month names.
const MONTHS_LONG = ["yanvar", "fevral", "mart", "aprel", "may", "iyun", "iyul", "avgust", "sentabr", "oktyabr", "noyabr", "dekabr"];
const MONTHS_SHORT = ["yan", "fev", "mar", "apr", "may", "iyn", "iyl", "avg", "sen", "okt", "noy", "dek"];

/** "19-sentabr" (long) or "19-sen" (short), in the viewer's local time. */
export function formatDayMonth(date: Date, style: "long" | "short" = "long") {
  const months = style === "long" ? MONTHS_LONG : MONTHS_SHORT;
  return `${date.getDate()}-${months[date.getMonth()]}`;
}

/** "14:05", 24-hour, local time. */
export function formatClock(date: Date) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

/** "19-sen 14:05" */
export function formatDateTime(date: Date) {
  return `${formatDayMonth(date, "short")} ${formatClock(date)}`;
}
