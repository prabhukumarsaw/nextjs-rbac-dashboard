import { redirect } from 'next/navigation';
import { getCurrentUser } from "@/lib/auth/jwt";

export default async function Dashboard() {
  const user = await getCurrentUser();

  if (user && user.userId) {
    redirect('/dashboard/overview');
  } else {
    redirect('/auth/sign-in');
  }
}