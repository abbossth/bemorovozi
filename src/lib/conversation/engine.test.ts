import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  assertCanConfirm,
  continueConversation,
  createInitialState,
  CONFIRM_PROMPT,
  CONFIRM_PROMPT_MANAGEMENT,
  CONTINUE_PROMPT,
  EngineError,
  greetingFor,
  handleMessage,
  handleMessageWithIntent,
  markDone,
  matchDepartmentName,
  MAX_CLARIFICATIONS,
  OFF_TOPIC_REPLY,
  patientTranscript,
  storedConversation,
} from "./engine";
import type { ConversationState, ModelFn, ModelOutput } from "./types";

const base = (state: Partial<ModelOutput> = {}): ModelOutput => ({
  stage: "ready_to_confirm",
  on_topic: true,
  type: "shikoyat",
  department: null,
  room_or_ward: null,
  staff_name: null,
  when: null,
  short_summary: "Qisqa tavsif.",
  assistant_reply_text: "Tushundim.",
  next_question_field: null,
  clarification_count: 0,
  route_to_management: false,
  card_reply: "not_applicable",
  ...state,
});

const question = (field: ModelOutput["next_question_field"], text = "Savol?"): ModelOutput =>
  base({ stage: "clarifying", assistant_reply_text: text, next_question_field: field });

function fresh(): ConversationState {
  return createInitialState({
    hospitalId: "h1",
    departmentId: "d1",
    hospitalName: "Urganch tibbiyot markazi",
    departmentName: "Kardiologiya bo'limi",
    departmentNames: ["Kardiologiya bo'limi", "Qabulxona", "Nevrologiya bo'limi"],
  });
}

/** A model stub that returns the queued outputs in order and records what it was asked. */
function scripted(...outputs: ModelOutput[]) {
  const calls: Parameters<ModelFn>[0][] = [];
  const queue = [...outputs];
  const fn: ModelFn = async (input) => {
    calls.push(input);
    const next = queue.shift();
    if (!next) throw new Error("model called more often than scripted");
    return next;
  };
  return { fn, calls };
}

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("STAGE 0 — greeting", () => {
  it("greets with the hospital name taken from configuration", () => {
    const state = fresh();
    expect(state.stage).toBe("gathering");
    expect(state.messages).toEqual([
      { role: "assistant", text: "Salom, Urganch tibbiyot markazi klinikasiga xush kelibsiz! Sizga qanday yordam bera olaman?" },
    ]);
    expect(greetingFor("Boshqa shifoxona")).toContain("Boshqa shifoxona");
  });
});

describe("scenario 1 — complete first message goes straight to the card", () => {
  it("asks nothing and shows the confirmation card", async () => {
    const { fn, calls } = scripted(
      base({ department: "Kardiologiya", room_or_ward: "3-xona", short_summary: "Hamshira dori bermadi." })
    );
    const next = await handleMessage(fresh(), "Kardiologiya bo'limida, 3-xonada, hamshira dori bermadi", fn);

    expect(calls).toHaveLength(1);
    expect(next.stage).toBe("confirming");
    expect(next.clarificationCount).toBe(0);
    const last = next.messages[next.messages.length - 1];
    expect(last.text).toBe(CONFIRM_PROMPT);
    expect(last.card).toMatchObject({
      type: "shikoyat",
      department: "Kardiologiya bo'limi", // matched to the real department name
      room: "3-xona",
      staff: "Aytilmagan",
      when: "Aniqlanmagan",
      summary: "Hamshira dori bermadi.",
    });
  });
});

describe("scenario 2 — vague message: clarify, never more than 3 questions", () => {
  it("asks up to 3 questions, then forces the card even if the model keeps asking", async () => {
    const { fn, calls } = scripted(
      question("room", "Qaysi xonada?"),
      question("when", "Qachon bo'ldi?"),
      question("staff", "Kim bilan bog'liq?"),
      question("department", "Yana bir savol?"), // model wants a 4th — must be refused
    );
    let state = await handleMessage(fresh(), "yomon edi", fn); // question 1
    expect(state.stage).toBe("gathering");
    state = await handleMessage(state, "3-xona", fn); // question 2
    state = await handleMessage(state, "kecha", fn); // question 3
    expect(state.clarificationCount).toBe(MAX_CLARIFICATIONS);
    expect(state.stage).toBe("gathering");

    state = await handleMessage(state, "hamshira", fn); // model asks a 4th — refused, card shown
    expect(state.stage).toBe("confirming");
    expect(state.clarificationCount).toBe(MAX_CLARIFICATIONS);
    expect(state.messages.filter((m) => m.role === "assistant" && m.text === "Yana bir savol?")).toHaveLength(0);
    expect(calls[3].remaining).toBe(0);
    expect(calls[0].remaining).toBe(3);
    expect(calls.map((c) => c.asked)).toEqual([0, 1, 2, 3]);
  });

  it("does not trust the model's own clarification_count", async () => {
    const { fn } = scripted({ ...question("room"), clarification_count: 0 }, { ...question("when"), clarification_count: 0 });
    let state = await handleMessage(fresh(), "yomon edi", fn);
    state = await handleMessage(state, "yo'q", fn);
    expect(state.clarificationCount).toBe(2);
  });

  it("marks unknown fields as 'Aniqlanmagan' / 'Aytilmagan' on the card", async () => {
    const { fn } = scripted(base({ room_or_ward: "aniqlanmagan", staff_name: "yo'q" }));
    const state = await handleMessage(fresh(), "ovqat sovuq edi", fn);
    expect(state.card).toMatchObject({ room: "Aniqlanmagan", staff: "Aytilmagan", when: "Aniqlanmagan" });
    expect(state.card?.department).toBe("Kardiologiya bo'limi"); // falls back to the QR's department
  });

  it("keeps fields learned earlier when a later turn returns null for them", async () => {
    const { fn } = scripted(
      { ...question("when"), room_or_ward: "3-xona" },
      base({ room_or_ward: null, when: "Bugun" })
    );
    let state = await handleMessage(fresh(), "hamshira kelmadi", fn);
    state = await handleMessage(state, "bugun", fn);
    expect(state.card).toMatchObject({ room: "3-xona", when: "Bugun" });
  });
});

describe("scenario 3 — 'Yo'q, davom etaman'", () => {
  async function confirming() {
    const { fn } = scripted(base({ room_or_ward: "3-xona" }));
    return handleMessage(fresh(), "hamshira kelmadi", fn);
  }

  it("goes back to listening, then re-shows an UPDATED card without new questions", async () => {
    let state = await confirming();
    state = continueConversation(state);
    expect(state.stage).toBe("gathering");
    expect(state.messages[state.messages.length - 1].text).toBe(CONTINUE_PROMPT);

    // The model would like to ask again, but the cap forces the card straight back.
    const { fn, calls } = scripted({ ...question("staff"), room_or_ward: "4-xona", short_summary: "Yangilangan tavsif." });
    state = await handleMessage(state, "aslida 4-xona edi", fn);
    expect(calls[0].remaining).toBe(0);
    expect(state.stage).toBe("confirming");
    expect(state.card).toMatchObject({ room: "4-xona", summary: "Yangilangan tavsif." });
    expect(state.messages.filter((m) => m.card)).toHaveLength(2); // both cards stay in the chat history
  });

  it("treats a message typed while the card is showing as 'continue' + that message", async () => {
    const state = await confirming();
    const { fn } = scripted(base({ when: "Bugun" }));
    const next = await handleMessage(state, "bugun tushdan keyin", fn);
    expect(next.stage).toBe("confirming");
    expect(next.card?.when).toBe("Bugun");
  });

  it("refuses 'continue' when no card is showing", () => {
    expect(() => continueConversation(fresh())).toThrow(EngineError);
  });
});

describe("scenario 4 — 'Yangidan boshlash'", () => {
  it("a rebuilt initial state is a clean STAGE 0 with a new epoch", async () => {
    const { fn } = scripted(base());
    const used = await handleMessage(fresh(), "hamshira kelmadi", fn);
    expect(used.messages.length).toBeGreaterThan(1);

    const restarted = createInitialState({
      hospitalId: used.hospitalId,
      departmentId: used.departmentId,
      hospitalName: used.hospitalName,
      departmentName: used.departmentName,
      departmentNames: used.departmentNames,
      epoch: used.epoch + 1,
    });
    expect(restarted).toMatchObject({ stage: "gathering", clarificationCount: 0, card: null, epoch: 1 });
    expect(restarted.messages).toHaveLength(1);
  });
});

describe("scenario 5 — staff conduct goes to management", () => {
  it("flags the card and switches the confirmation wording", async () => {
    const { fn } = scripted(base({ route_to_management: true, staff_name: "Dr. Karimov" }));
    const state = await handleMessage(fresh(), "Shifokor menga baqirdi", fn);
    expect(state.card?.routeToManagement).toBe(true);
    expect(state.card?.staff).toBe("Dr. Karimov");
    expect(state.messages[state.messages.length - 1].text).toBe(CONFIRM_PROMPT_MANAGEMENT);
  });
});

describe("scope guard", () => {
  it("off-topic messages only add the refusal — no card, no question counted", async () => {
    const { fn } = scripted(base({ on_topic: false, assistant_reply_text: OFF_TOPIC_REPLY }));
    const state = await handleMessage(fresh(), "Ob-havo qanday?", fn);
    expect(state.stage).toBe("gathering");
    expect(state.card).toBeNull();
    expect(state.clarificationCount).toBe(0);
    expect(state.messages[state.messages.length - 1].text).toBe(OFF_TOPIC_REPLY);
  });

  it("keeps off-topic chatter out of the transcript and the stored conversation", async () => {
    const { fn } = scripted(base({ on_topic: false, assistant_reply_text: OFF_TOPIC_REPLY }), base());
    let state = await handleMessage(fresh(), "Ob-havo qanday?", fn);
    // still visible in the chat…
    expect(state.messages.map((m) => m.text)).toContain("Ob-havo qanday?");
    state = await handleMessage(state, "hamshira kelmadi", fn);
    // …but never stored or classified
    expect(patientTranscript(state)).toBe("hamshira kelmadi");
    const stored = storedConversation(state).map((m) => m.text);
    expect(stored).not.toContain("Ob-havo qanday?");
    expect(stored).not.toContain(OFF_TOPIC_REPLY);
    expect(stored).toContain("hamshira kelmadi");
  });

  it("off-topic while the card is showing keeps the card confirmable", async () => {
    const { fn } = scripted(base(), base({ on_topic: false, assistant_reply_text: "" }));
    let state = await handleMessage(fresh(), "hamshira kelmadi", fn);
    state = await handleMessage(state, "kim yutdi kecha futbolda?", fn);
    expect(state.stage).toBe("confirming");
    expect(state.messages[state.messages.length - 1].text).toBe(OFF_TOPIC_REPLY);
    expect(() => assertCanConfirm(state)).not.toThrow();
  });
});

describe("confirmation gate — nothing is sent without it", () => {
  it("only a conversation showing its card can be confirmed", async () => {
    expect(() => assertCanConfirm(fresh())).toThrow(EngineError);

    const { fn } = scripted(question("room"), base());
    let state = await handleMessage(fresh(), "yomon edi", fn);
    expect(() => assertCanConfirm(state)).toThrow(EngineError); // still clarifying

    state = await handleMessage(state, "3-xona", fn);
    expect(assertCanConfirm(state).summary).toBe("Qisqa tavsif.");
    expect(() => assertCanConfirm(markDone(state))).toThrow(EngineError); // already submitted
  });
});

describe("robustness", () => {
  it("falls back to a card built from the patient's own words if the model fails", async () => {
    const failing: ModelFn = async () => {
      throw new Error("429 quota");
    };
    const state = await handleMessage(fresh(), "Navbat juda uzoq bo'ldi", failing);
    expect(state.stage).toBe("confirming");
    expect(state.card?.summary).toBe("Navbat juda uzoq bo'ldi");
  });

  it("rejects empty, oversized and endless conversations", async () => {
    const { fn } = scripted();
    await expect(handleMessage(fresh(), "   ", fn)).rejects.toMatchObject({ code: "empty" });
    await expect(handleMessage(fresh(), "a".repeat(2000), fn)).rejects.toMatchObject({ code: "too_long" });
    const long = { ...fresh(), messages: Array.from({ length: 40 }, () => ({ role: "patient" as const, text: "x" })) };
    await expect(handleMessage(long, "yana", fn)).rejects.toMatchObject({ code: "conversation_too_long" });
    await expect(handleMessage(markDone(fresh()), "salom", fn)).rejects.toMatchObject({ code: "wrong_stage" });
  });

  it("stores only the patient's words as the transcript", async () => {
    const { fn } = scripted(question("room"), base());
    let state = await handleMessage(fresh(), "hamshira kelmadi", fn);
    state = await handleMessage(state, "3-xona", fn);
    expect(patientTranscript(state)).toBe("hamshira kelmadi\n3-xona");
  });
});

describe("matchDepartmentName", () => {
  const names = ["Kardiologiya bo'limi", "Qabulxona"];
  it("matches loosely in both directions and ignores apostrophe style", () => {
    expect(matchDepartmentName("kardiologiya", names)).toBe("Kardiologiya bo'limi");
    expect(matchDepartmentName("Kardiologiya boʻlimi", names)).toBe("Kardiologiya bo'limi");
    expect(matchDepartmentName("Reanimatsiya", names)).toBeNull();
    expect(matchDepartmentName(null, names)).toBeNull();
  });
});

describe("the card can be answered in words, like its buttons", () => {
  async function withCard(...next: ModelOutput[]) {
    const { fn } = scripted(base({ room_or_ward: "3-xona", department: "Kardiologiya bo'limi" }), ...next);
    const shown = await handleMessage(fresh(), "Kardiologiya bo'limida 3-xonada hamshira kelmadi", fn);
    expect(shown.stage).toBe("confirming");
    return { shown, fn };
  }

  it("'ha, yuboring' confirms — like pressing 'Ha, to'g'ri — yubor' — without storing the yes", async () => {
    const { shown, fn } = await withCard(base({ card_reply: "confirm", room_or_ward: "3-xona" }));
    const result = await handleMessageWithIntent(shown, "Ha, hammasi to'g'ri, yuborsang bo'ladi.", fn);

    expect(result.intent).toBe("confirm");
    expect(result.state.stage).toBe("confirming"); // still confirmable: finalize gates on it
    expect(assertCanConfirm(result.state).room).toBe("3-xona");
    expect(patientTranscript(result.state)).toBe("Kardiologiya bo'limida 3-xonada hamshira kelmadi");
    expect(storedConversation(result.state).map((m) => m.text)).not.toContain("Ha, hammasi to'g'ri, yuborsang bo'ladi.");
  });

  it("does not mistake a differently-worded but identical department for a change", async () => {
    const { shown, fn } = await withCard(base({ card_reply: "confirm", department: "Kardiologiya", room_or_ward: "3-xona" }));
    expect((await handleMessageWithIntent(shown, "ha yubor", fn)).intent).toBe("confirm");
  });

  it("'yo'q' works like 'Yo'q, davom etaman': back to listening, no new card yet", async () => {
    const { shown, fn } = await withCard(base({ card_reply: "wants_to_continue" }));
    const result = await handleMessageWithIntent(shown, "yo'q", fn);

    expect(result.intent).toBe("none");
    expect(result.state.stage).toBe("gathering");
    expect(result.state.messages[result.state.messages.length - 1].text).toBe(CONTINUE_PROMPT);
    expect(patientTranscript(result.state)).not.toContain("yo'q");
  });

  it("'yangidan boshlash' asks the route to restart", async () => {
    const { shown, fn } = await withCard(base({ card_reply: "restart" }));
    expect((await handleMessageWithIntent(shown, "boshidan boshlaymiz", fn)).intent).toBe("restart");
  });

  it("a correction is an update, not a confirmation, even if the model says 'confirm'", async () => {
    // model claims "confirm" but changed the room → the server refuses to submit
    const { shown, fn } = await withCard(base({ card_reply: "confirm", room_or_ward: "5-xona", short_summary: "Yangilandi." }));
    const result = await handleMessageWithIntent(shown, "ha, lekin 5-xona edi", fn);

    expect(result.intent).toBe("none");
    expect(result.state.stage).toBe("confirming");
    expect(result.state.card?.room).toBe("5-xona");
    expect(result.state.messages.filter((m) => m.card)).toHaveLength(2);
  });

  it("a long reply is never treated as a bare 'yes'", async () => {
    const long = "ha to'g'ri lekin shuni ham qo'shing ki hamshira ikki marta chaqirilganda ham kelmadi va shifokor ham yo'q edi";
    const { shown, fn } = await withCard(base({ card_reply: "confirm", room_or_ward: "3-xona" }));
    const result = await handleMessageWithIntent(shown, long, fn);
    expect(result.intent).toBe("none");
    expect(patientTranscript(result.state)).toContain("ikki marta");
  });

  it("'confirm' is ignored unless the card was actually showing", async () => {
    const { fn } = scripted({ ...question("room"), card_reply: "confirm" });
    const result = await handleMessageWithIntent(fresh(), "ha", fn);
    expect(result.intent).toBe("none");
    expect(result.state.stage).toBe("gathering");
  });

  it("an off-topic reply while the card is showing is never a confirmation", async () => {
    const { shown, fn } = await withCard(base({ on_topic: false, card_reply: "confirm", assistant_reply_text: "" }));
    const result = await handleMessageWithIntent(shown, "kim yutdi futbolda?", fn);
    expect(result.intent).toBe("none");
    expect(result.state.stage).toBe("confirming");
  });
});
