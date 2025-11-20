import KBar from '@/components/kbar';
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/jwt";
import { getUserMenus } from "@/lib/auth/permissions";
import AppSidebar from '@/components/layout/app-sidebar';
import Header from '@/components/layout/header';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import type { Metadata } from 'next';
import { cookies } from 'next/headers';

export const metadata: Metadata = {
  title: 'Next Shadcn Dashboard Starter',
  description: 'Basic dashboard with Next.js and Shadcn'
};

export default async function DashboardLayout({
  children
}: {
  children: React.ReactNode;
}) {
  // Check authentication
  const user = await getCurrentUser();
  if (!user) {
    redirect("/auth/sign-in");
  }

  // Persisting the sidebar state in the cookie.
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar_state")?.value === "true"

  // Get user's accessible menus
  const menus = await getUserMenus(user.userId);


  return (
    <KBar>
      <SidebarProvider defaultOpen={defaultOpen}>
        <AppSidebar menus={menus} user={user} />
        <SidebarInset>
          <Header user={user} />
          {/* page main content */}
          {children}
          {/* page main content ends */}
        </SidebarInset>
      </SidebarProvider>
    </KBar>
  );
}
