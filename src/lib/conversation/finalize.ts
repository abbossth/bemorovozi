import { connectDB } from "@/lib/db";
import Department from "@/models/Department";
import { createFeedback } from "@/lib/createFeedback";
import {
  assertCanConfirm,
  matchDepartmentName,
  patientTranscript,
  STAFF_UNKNOWN_LABEL,
  storedConversation,
  UNKNOWN_LABEL,
} from "./engine";
import type { Card, ConversationState } from "./types";

const known = (value: string | null, unknownLabel: string) => (value && value !== unknownLabel ? value : undefined);

function classifierContext(card: Card) {
  const lines = [
    `Tur: ${card.type ?? UNKNOWN_LABEL}`,
    `Bo'lim: ${card.department ?? UNKNOWN_LABEL}`,
    `Xona/palata: ${card.room ?? UNKNOWN_LABEL}`,
    `Xodim: ${card.staff ?? STAFF_UNKNOWN_LABEL}`,
    `Vaqt: ${card.when ?? UNKNOWN_LABEL}`,
    `Qisqa tavsif: ${card.summary}`,
  ];
  return `[Suhbatda aniqlashtirilgan ma'lumot]\n${lines.join("\n")}`;
}

/**
 * STAGE 4. Only a conversation that is showing its confirmation card gets here
 * (assertCanConfirm) — then it goes through the same createFeedback pipeline as every
 * other channel: severity/issue analysis, MongoDB, staff notification.
 */
export async function finalizeConversation(state: ConversationState, channel: "text" | "voice") {
  const card = assertCanConfirm(state);
  await connectDB();

  // File under the department the patient named, if it is one of ours; otherwise under the QR's.
  let departmentId = state.departmentId;
  const namedDepartment = matchDepartmentName(card.department, state.departmentNames);
  if (namedDepartment && namedDepartment !== state.departmentName) {
    const match = await Department.findOne({ hospitalId: state.hospitalId, name: namedDepartment }).select("_id").lean();
    if (match) departmentId = String(match._id);
  }

  return createFeedback({
    hospitalId: state.hospitalId,
    departmentId,
    channel,
    transcript: patientTranscript(state),
    source: "web",
    extras: {
      kind: card.type ?? "shikoyat",
      roomOrWard: known(card.room, UNKNOWN_LABEL),
      staffName: known(card.staff, STAFF_UNKNOWN_LABEL),
      occurredAt: known(card.when, UNKNOWN_LABEL),
      routedToManagement: card.routeToManagement,
      conversation: storedConversation(state),
      classifierContext: classifierContext(card),
    },
  });
}
