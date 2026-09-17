import { redirect } from "next/navigation";
import { getCurrentStaff } from "@/lib/session";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const staff = await getCurrentStaff();
  if (!staff) redirect("/login");

  return (
    <div className="flex min-h-screen bg-[#F7F9F8]">
      <DashboardSidebar staffName={staff.name} />
      <div className="flex-grow overflow-hidden">{children}</div>
    </div>
  );
}
