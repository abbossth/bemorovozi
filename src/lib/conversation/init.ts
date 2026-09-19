import { isValidObjectId } from "mongoose";
import { connectDB } from "@/lib/db";
import Hospital from "@/models/Hospital";
import Department from "@/models/Department";
import { createInitialState } from "./engine";
import type { ConversationState } from "./types";

export class ConversationTargetNotFoundError extends Error {}

/**
 * Builds STAGE 0 for a QR-scanned hospital + department. The hospital name comes from the
 * database (editable in Sozlamalar) — the greeting never hardcodes it.
 */
export async function buildInitialState(hospitalId: string, departmentId: string, epoch = 0): Promise<ConversationState> {
  if (!isValidObjectId(hospitalId) || !isValidObjectId(departmentId)) {
    throw new ConversationTargetNotFoundError("Shifoxona yoki bo'lim topilmadi");
  }
  await connectDB();
  const [hospital, department, departments] = await Promise.all([
    Hospital.findById(hospitalId).lean(),
    Department.findOne({ _id: departmentId, hospitalId }).lean(),
    Department.find({ hospitalId }).select("name").lean(),
  ]);
  if (!hospital || !department) throw new ConversationTargetNotFoundError("Shifoxona yoki bo'lim topilmadi");

  return createInitialState({
    hospitalId,
    departmentId,
    hospitalName: hospital.name,
    departmentName: department.name,
    departmentNames: departments.map((d) => d.name),
    epoch,
  });
}
