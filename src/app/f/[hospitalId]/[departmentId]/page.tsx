import { notFound } from "next/navigation";
import { connectDB } from "@/lib/db";
import Hospital from "@/models/Hospital";
import Department from "@/models/Department";
import { PatientFeedbackForm } from "@/components/patient/PatientFeedbackForm";

type Params = { hospitalId: string; departmentId: string };

export default async function PatientFormPage({ params }: { params: Promise<Params> }) {
  const { hospitalId, departmentId } = await params;

  await connectDB();
  const [hospital, department] = await Promise.all([
    Hospital.findById(hospitalId).lean(),
    Department.findOne({ _id: departmentId, hospitalId }).lean(),
  ]);

  if (!hospital || !department) notFound();

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F7F9F8] py-6">
      <div className="w-full max-w-[390px] rounded-[28px] bg-white shadow-sm">
        <PatientFeedbackForm
          hospitalId={hospitalId}
          departmentId={departmentId}
          departmentName={department.name}
        />
      </div>
    </main>
  );
}
