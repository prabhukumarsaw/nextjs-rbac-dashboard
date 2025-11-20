import { getCurrentUser } from "@/lib/auth/jwt";
import { redirect } from "next/navigation";
import { HomePageContent } from "@/components/home/home-page-content";

/**
 * Home Page
 * Shows login/register for unauthenticated users
 * Redirects authenticated users to dashboard
 */
export default async function Home() {
  const user = await getCurrentUser();
  
  if (user) {
    redirect("/dashboard");
  }

  return <HomePageContent />;
}
