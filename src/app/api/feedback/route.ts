import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import Department from "@/models/Department";
import Feedback from "@/models/Feedback";
import { ai } from "@/lib/ai";
import { generateTrackingCode } from "@/lib/trackingCode";

const bodySchema = z.object({
  hospitalId: z.string(),
  departmentId: z.string(),
  channel: z.enum(["text", "voice"]),
  transcript: z.string().min(3, "Xabar juda qisqa"),
});

export async function POST(request: Request) {
  try {
    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Noto'g'ri so'rov" }, { status: 400 });
    }
    const { hospitalId, departmentId, channel, transcript } = parsed.data;

    await connectDB();

    const department = await Department.findOne({ _id: departmentId, hospitalId });
    if (!department) {
      return NextResponse.json({ error: "Bo'lim topilmadi" }, { status: 404 });
    }

    const allDepartments = await Department.find({ hospitalId }).select("name").lean();

    let classification;
    try {
      classification = await ai.classifyFeedback({
        transcript,
        departmentName: department.name,
        availableDepartments: allDepartments.map((d) => d.name),
      });
    } catch (error) {
      console.error("[api/feedback] AI classification failed:", error);
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
    // QR code's own department so the dashboard filter matches the physical location.
    let trackingCode = generateTrackingCode();
    for (let attempt = 0; attempt < 5; attempt++) {
      const exists = await Feedback.exists({ trackingCode });
      if (!exists) break;
      trackingCode = generateTrackingCode();
    }

    const feedback = await Feedback.create({
      hospitalId,
      departmentId,
      channel,
      transcript,
      aiSummary: classification.summary,
      severity: classification.severity,
      issueTag: classification.issueTag,
      trackingCode,
    });

    return NextResponse.json({ trackingCode: feedback.trackingCode });
  } catch (error) {
    console.error("[api/feedback] Unexpected error:", error);
    return NextResponse.json({ error: "Kutilmagan xatolik yuz berdi. Qaytadan urinib ko'ring." }, { status: 500 });
  }
}
