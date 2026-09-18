import { connectDB } from "@/lib/db";
import Department from "@/models/Department";
import Feedback from "@/models/Feedback";
import { ai } from "@/lib/ai";
import { generateTrackingCode } from "@/lib/trackingCode";
import { notifyStaffForFeedback } from "@/lib/telegram/notifyStaff";
import { time, mark } from "@/lib/timing";

export class DepartmentNotFoundError extends Error {}

type CreateFeedbackInput = {
  hospitalId: string;
  departmentId: string;
  channel: "text" | "voice";
  transcript: string;
  source: "web" | "telegram";
};

/**
 * Single entry point for turning a raw transcript into a classified, stored
 * Feedback document — used by the web /api/feedback route AND both Telegram
 * bots, so there is exactly one place that talks to the AI classifier and
 * writes to the Feedback collection.
 */
export async function createFeedback({ hospitalId, departmentId, channel, transcript, source }: CreateFeedbackInput) {
  const totalStart = Date.now();
  await time("createFeedback.connectDB", () => connectDB());

  const department = await time("createFeedback.departmentLookup", () =>
    Department.findOne({ _id: departmentId, hospitalId })
  );
  if (!department) throw new DepartmentNotFoundError("Bo'lim topilmadi");

  const allDepartments = await time("createFeedback.allDepartmentsLookup", () =>
    Department.find({ hospitalId }).select("name").lean()
  );

  let classification;
  try {
    classification = await time("createFeedback.aiClassify", () =>
      ai.classifyFeedback({
        transcript,
        departmentName: department.name,
        availableDepartments: allDepartments.map((d) => d.name),
      })
    );
  } catch (error) {
    console.error("[createFeedback] AI classification failed:", error);
    // Don't let a flaky AI provider block the patient from submitting — file it
    // as medium severity and let a human triage it; the transcript itself is never lost.
    classification = {
      severity: "orta" as const,
      summary: transcript.slice(0, 200),
      suggestedDepartment: department.name,
      issueTag: "tahlil_qilinmagan",
    };
  }

  // suggestedDepartment is informational for now — feedback stays filed under the
  // QR/bot's own department so the dashboard filter matches the physical location.
  const trackingCodeStart = Date.now();
  let trackingCode = generateTrackingCode();
  for (let attempt = 0; attempt < 5; attempt++) {
    const exists = await Feedback.exists({ trackingCode });
    if (!exists) break;
    trackingCode = generateTrackingCode();
  }
  mark("createFeedback.trackingCodeLoop", { ms: Date.now() - trackingCodeStart });

  const feedback = await time("createFeedback.mongoInsert", () =>
    Feedback.create({
      hospitalId,
      departmentId,
      channel,
      transcript,
      aiSummary: classification.summary,
      severity: classification.severity,
      issueTag: classification.issueTag,
      trackingCode,
      source,
    })
  );

  mark("createFeedback.total", { ms: Date.now() - totalStart });

  // Best-effort — a Telegram outage must never block a patient's submission.
  const notifyStart = Date.now();
  notifyStaffForFeedback(feedback, department)
    .catch((error) => {
      console.error("[createFeedback] Staff notification failed:", error);
    })
    .finally(() => {
      mark("createFeedback.notifyStaff.backgroundTotal", { ms: Date.now() - notifyStart });
    });

  return feedback;
}
