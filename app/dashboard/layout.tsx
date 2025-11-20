import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/jwt";
import { getUserMenus } from "@/lib/auth/permissions";
import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { DashboardHeader } from "@/components/dashboard/header";

/**
 * Dashboard Layout Component
 * Provides authenticated layout with sidebar navigation and header
 * Implements menu-based permission system
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Check authentication
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  // Get user's accessible menus
  const menus = await getUserMenus(user.userId);

  return (
    <div className="flex h-screen overflow-hidden">
      <DashboardSidebar menus={menus} user={user} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <DashboardHeader user={user} />
        <main className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-900 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

