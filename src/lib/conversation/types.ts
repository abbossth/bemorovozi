export type ChatRole = "assistant" | "patient";
export type FeedbackType = "shikoyat" | "taklif";

/** gathering = AI is listening/clarifying · confirming = card shown, waiting for the patient · done = submitted */
export type Stage = "gathering" | "confirming" | "done";

/** The structured record the patient confirms (STAGE 3) — the same shape in text and voice mode. */
export type Card = {
  type: FeedbackType | null;
  department: string | null;
  room: string | null;
  staff: string | null;
  when: string | null;
  summary: string;
  /** staff-conduct complaints skip the department and go straight to management */
  routeToManagement: boolean;
};

export type ChatMessage = {
  role: ChatRole;
  text: string;
  /** set on the assistant message that presents the confirmation card */
  card?: Card;
  /** an off-topic exchange (patient message + the refusal): shown in the chat, never stored */
  offTopic?: boolean;
};

/**
 * Whole conversation state. It lives on the client between turns but is HMAC-signed
 * (see token.ts), so the client can read it yet cannot forge a stage or a card —
 * every transition is decided by the server-side engine.
 */
export type ConversationState = {
  v: 1;
  issuedAt: number;
  /** bumped on "Yangidan boshlash" so clients can tell a fresh conversation apart */
  epoch: number;
  hospitalId: string;
  departmentId: string;
  hospitalName: string;
  /** the department whose QR the patient scanned — the physical location */
  departmentName: string;
  departmentNames: string[];
  stage: Stage;
  messages: ChatMessage[];
  clarificationCount: number;
  card: Card | null;
};

/** What the browser gets to render. */
export type ConversationView = {
  epoch: number;
  stage: Stage;
  messages: ChatMessage[];
};

export type ModelField = "department" | "room" | "staff" | "when";

/** Structured output requested from Gemini on every patient message. */
export type ModelOutput = {
  stage: "clarifying" | "ready_to_confirm";
  on_topic: boolean;
  type: FeedbackType | null;
  department: string | null;
  room_or_ward: string | null;
  staff_name: string | null;
  when: string | null;
  short_summary: string;
  assistant_reply_text: string;
  next_question_field: ModelField | null;
  clarification_count: number;
  route_to_management: boolean;
};

export type ModelInput = {
  state: ConversationState;
  /** clarifying questions already asked */
  asked: number;
  /** how many more are allowed (0 = the model must move to confirmation) */
  remaining: number;
};

export type ModelFn = (input: ModelInput) => Promise<ModelOutput>;
