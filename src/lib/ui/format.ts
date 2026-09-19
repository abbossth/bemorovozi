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
