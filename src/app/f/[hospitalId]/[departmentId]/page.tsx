import { notFound } from "next/navigation";
import { PatientFeedbackForm } from "@/components/patient/PatientFeedbackForm";
import { buildInitialState, ConversationTargetNotFoundError } from "@/lib/conversation/init";
import { toView } from "@/lib/conversation/engine";
import { signState } from "@/lib/conversation/token";

type Params = { hospitalId: string; departmentId: string };

export default async function PatientFormPage({ params }: { params: Promise<Params> }) {
  const { hospitalId, departmentId } = await params;

  // STAGE 0 is built here on the server: the greeting uses the hospital name from the database.
  let state;
  try {
    state = await buildInitialState(hospitalId, departmentId);
  } catch (error) {
    if (error instanceof ConversationTargetNotFoundError) notFound();
    throw error;
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F7F9F8] py-6">
      <div className="w-full max-w-[390px] rounded-[28px] bg-white shadow-sm">
        <PatientFeedbackForm
          departmentName={state.departmentName}
          initialToken={signState(state)}
          initialView={toView(state)}
        />
      </div>
    </main>
  );
}
