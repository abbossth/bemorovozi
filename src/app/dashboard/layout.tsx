import { redirect } from "next/navigation";
import { getCurrentStaff } from "@/lib/session";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const staff = await getCurrentStaff();
  if (!staff) redirect("/login");

  return <DashboardSidebar staffName={staff.name}>{children}</DashboardSidebar>;
}
