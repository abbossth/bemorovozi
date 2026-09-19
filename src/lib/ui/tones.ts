// The ONE place the admin panel's status colors live. Severity, status, tags and filter chips all
// read from here, so a "warning" amber on a tag can never drift from the amber on an "O'rta" badge.

export type Tone = "danger" | "warning" | "success" | "neutral";

export const TONE: Record<Tone, { fg: string; bg: string }> = {
  danger: { fg: "#E5534B", bg: "#FCEBEA" }, // coral
  warning: { fg: "#B36B00", bg: "#FDF3E4" }, // amber
  success: { fg: "#0F6E5C", bg: "#EAF5F2" }, // teal
  neutral: { fg: "#4B5563", bg: "#F3F4F6" }, // gray
};

/** Selected filter chip / selected list card. */
export const SELECTED = { border: "#0F6E5C", bg: "#EAF5F2", fg: "#0F6E5C" };
export const IDLE = { border: "#E4E7EB", bg: "#FFFFFF", fg: "#4B5563" };
