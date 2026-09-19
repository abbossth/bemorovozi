// The ONE conversation state machine, shared by text chat and voice. Voice is only an
// STT/TTS layer on top: it feeds this engine the patient's transcribed words and speaks
// the assistant's text reply — no separate dialogue logic exists for it.
//
//   STAGE 0  greeting            (createInitialState)
//   STAGE 1-2 listen + clarify   (handleMessage, at most MAX_CLARIFICATIONS questions)
//   STAGE 3  confirmation card   (stage "confirming" — nothing is sent without the patient's OK)
//   STAGE 4  submit              (assertCanConfirm → finalize.ts)
//
// The model only extracts fields and phrases replies. The server decides everything that
// matters: the question cap, when to show the card, and every stage transition.

import type { Card, ChatMessage, ConversationState, ConversationView, ModelFn, ModelOutput } from "./types";

export const MAX_CLARIFICATIONS = 3;
export const MAX_MESSAGES = 40;
export const MAX_TEXT_LENGTH = 1500;

export const CONFIRM_PROMPT = "Shu to'g'rimi? Tasdiqlasangiz, tegishli bo'limga yuboraman.";
export const CONFIRM_PROMPT_MANAGEMENT = "Shu to'g'rimi? Tasdiqlasangiz, rahbariyatga yuboraman.";
export const CONTINUE_PROMPT = "Xo'p, davom eting. Nimani qo'shmoqchi yoki tuzatmoqchisiz?";

export const UNKNOWN_LABEL = "Aniqlanmagan";
export const STAFF_UNKNOWN_LABEL = "Aytilmagan";

export class EngineError extends Error {
  constructor(
    public readonly code: "empty" | "too_long" | "conversation_too_long" | "wrong_stage",
    message: string
  ) {
    super(message);
  }
}

export function greetingFor(hospitalName: string) {
  return `Salom, ${hospitalName} klinikasiga xush kelibsiz! Sizga qanday yordam bera olaman?`;
}

export function createInitialState(params: {
  hospitalId: string;
  departmentId: string;
  hospitalName: string;
  departmentName: string;
  departmentNames: string[];
  epoch?: number;
}): ConversationState {
  return {
    v: 1,
    issuedAt: Date.now(),
    epoch: params.epoch ?? 0,
    hospitalId: params.hospitalId,
    departmentId: params.departmentId,
    hospitalName: params.hospitalName,
    departmentName: params.departmentName,
    departmentNames: params.departmentNames,
    stage: "gathering",
    messages: [{ role: "assistant", text: greetingFor(params.hospitalName) }],
    clarificationCount: 0,
    card: null,
  };
}

export function toView(state: ConversationState): ConversationView {
  return { epoch: state.epoch, stage: state.stage, messages: state.messages };
}

const EMPTY_VALUES = new Set(["", "null", "-", "yo'q", "yoq", "noma'lum", "nomalum", "aniqlanmagan", "aytilmagan"]);

function cleanField(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  return EMPTY_VALUES.has(trimmed.toLowerCase()) ? null : trimmed;
}

function normalizeName(name: string) {
  return name.toLowerCase().replace(/[’`ʻʼ‘]/g, "'").replace(/\s+/g, " ").trim();
}

/** Maps a free-text department mention onto one of the hospital's real department names. */
export function matchDepartmentName(raw: string | null, names: string[]): string | null {
  if (!raw) return null;
  const wanted = normalizeName(raw);
  const exact = names.find((n) => normalizeName(n) === wanted);
  if (exact) return exact;
  // "Kardiologiya" should match "Kardiologiya bo'limi" (either way round).
  const loose = names.find((n) => {
    const candidate = normalizeName(n);
    return candidate.includes(wanted) || wanted.includes(candidate);
  });
  return loose ?? null;
}

function patientTexts(messages: ChatMessage[]) {
  return messages.filter((m) => m.role === "patient" && !m.offTopic).map((m) => m.text);
}

/** The conversation as it is stored: everything except off-topic chatter. */
export function storedConversation(state: ConversationState) {
  return state.messages.filter((m) => !m.offTopic).map(({ role, text }) => ({ role, text }));
}

export function patientTranscript(state: ConversationState) {
  return patientTexts(state.messages).join("\n");
}

/** If the model can't be reached the patient must not be stranded: fall through to a card built from their own words. */
function fallbackOutput(state: ConversationState): ModelOutput {
  return {
    stage: "ready_to_confirm",
    on_topic: true,
    type: null,
    department: null,
    room_or_ward: null,
    staff_name: null,
    when: null,
    short_summary: patientTexts(state.messages).join(" ").slice(0, 240),
    assistant_reply_text: "",
    next_question_field: null,
    clarification_count: state.clarificationCount,
    route_to_management: state.card?.routeToManagement ?? false,
  };
}

/** At the confirmation step every still-unknown field is shown as "aniqlanmagan" instead of being left blank. */
function fillForConfirmation(card: Card, state: ConversationState): Card {
  const department = matchDepartmentName(card.department, state.departmentNames) ?? card.department;
  return {
    ...card,
    department: department ?? state.departmentName,
    room: card.room ?? UNKNOWN_LABEL,
    staff: card.staff ?? STAFF_UNKNOWN_LABEL,
    when: card.when ?? UNKNOWN_LABEL,
  };
}

function applyModelOutput(
  state: ConversationState,
  out: ModelOutput,
  previousStage: ConversationState["stage"]
): ConversationState {
  if (!out.on_topic) {
    // Off-topic / injection attempts stay visible in the chat but are flagged so they are never
    // stored, never sent to the classifier, and never end up in the summary.
    const reply: ChatMessage = {
      role: "assistant",
      text: out.assistant_reply_text.trim() || OFF_TOPIC_REPLY,
      offTopic: true,
    };
    const messages = state.messages.map((m, i) => (i === state.messages.length - 1 ? { ...m, offTopic: true } : m));
    return { ...state, stage: previousStage, messages: [...messages, reply] };
  }

  const prev = state.card;
  const merged: Card = {
    type: out.type ?? prev?.type ?? null,
    department: cleanField(out.department) ?? prev?.department ?? null,
    room: cleanField(out.room_or_ward) ?? prev?.room ?? null,
    staff: cleanField(out.staff_name) ?? prev?.staff ?? null,
    when: cleanField(out.when) ?? prev?.when ?? null,
    summary: out.short_summary.trim() || prev?.summary || patientTexts(state.messages).join(" ").slice(0, 240),
    routeToManagement: out.route_to_management,
  };

  const reply = out.assistant_reply_text.trim();
  const mayAsk = state.clarificationCount < MAX_CLARIFICATIONS; // the hard cap — the model's own count is not trusted
  if (out.stage === "clarifying" && mayAsk && reply) {
    return {
      ...state,
      stage: "gathering",
      clarificationCount: state.clarificationCount + 1,
      card: merged,
      messages: [...state.messages, { role: "assistant", text: reply }],
    };
  }

  const card = fillForConfirmation(merged, state);
  return {
    ...state,
    stage: "confirming",
    card,
    messages: [
      ...state.messages,
      { role: "assistant", text: card.routeToManagement ? CONFIRM_PROMPT_MANAGEMENT : CONFIRM_PROMPT, card },
    ],
  };
}

export const OFF_TOPIC_REPLY =
  "Kechirasiz, men bu masalada yordam bera olmayman. Men faqat shifoxona xizmati bo'yicha shikoyat va takliflarni qabul qilaman.";

export async function handleMessage(state: ConversationState, rawText: string, model: ModelFn): Promise<ConversationState> {
  if (state.stage === "done") throw new EngineError("wrong_stage", "Suhbat yakunlangan.");

  const text = rawText.trim();
  if (!text) throw new EngineError("empty", "Xabar bo'sh.");
  if (text.length > MAX_TEXT_LENGTH) throw new EngineError("too_long", "Xabar juda uzun. Qisqaroq yozing.");
  if (state.messages.length >= MAX_MESSAGES) {
    throw new EngineError("conversation_too_long", "Suhbat juda uzun bo'lib ketdi. Yangidan boshlang.");
  }

  const previousStage = state.stage;
  const base: ConversationState = {
    ...state,
    stage: "gathering",
    messages: [...state.messages, { role: "patient", text }],
    // A patient who adds to an already-shown card gets the updated card straight back — no new questions.
    clarificationCount: previousStage === "confirming" ? MAX_CLARIFICATIONS : state.clarificationCount,
  };

  let out: ModelOutput;
  try {
    out = await model({
      state: base,
      asked: base.clarificationCount,
      remaining: Math.max(0, MAX_CLARIFICATIONS - base.clarificationCount),
    });
  } catch (error) {
    console.error("[conversation] model call failed, using fallback card:", error);
    out = fallbackOutput(base);
  }

  return applyModelOutput(base, out, previousStage);
}

/** "Yo'q, davom etaman": back to listening; the next message goes straight to an updated card. */
export function continueConversation(state: ConversationState): ConversationState {
  if (state.stage !== "confirming") throw new EngineError("wrong_stage", "Tasdiqlash bosqichi emas.");
  return {
    ...state,
    stage: "gathering",
    clarificationCount: MAX_CLARIFICATIONS,
    messages: [...state.messages, { role: "assistant", text: CONTINUE_PROMPT }],
  };
}

/** The gate for submitting: only a conversation that is showing its card may be confirmed. */
export function assertCanConfirm(state: ConversationState): Card {
  if (state.stage !== "confirming" || !state.card) {
    throw new EngineError("wrong_stage", "Avval ma'lumotni tasdiqlash kartasini ko'rib chiqing.");
  }
  return state.card;
}

export function markDone(state: ConversationState): ConversationState {
  return { ...state, stage: "done" };
}
