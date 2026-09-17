import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { getCurrentStaff } from "@/lib/session";
import { connectDB } from "@/lib/db";
import Department from "@/models/Department";
import { patientFormUrl, qrDataUrl } from "@/lib/qr";
import { QrCardDocument } from "@/lib/pdf/QrCardDocument";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const staff = await getCurrentStaff();
  if (!staff) return NextResponse.json({ error: "Ruxsat berilmagan" }, { status: 401 });

  const { id } = await params;
  await connectDB();

  const department = await Department.findOne({ _id: id, hospitalId: staff.hospitalId }).lean();
  if (!department) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });

  const url = patientFormUrl(String(staff.hospitalId), String(department._id));
  const qr = await qrDataUrl(url);

  const buffer = await renderToBuffer(<QrCardDocument departmentName={department.name} qrDataUrl={qr} />);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${department.qrSlug}-qr.pdf"`,
    },
  });
}
