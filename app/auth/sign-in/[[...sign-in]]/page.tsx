import { redirect } from 'next/navigation';
import { getCurrentUser } from "@/lib/auth/jwt";
import { SignInViewPage } from '@/features/auth/components/sign-in-view';

export default async function Page() {
  const user = await getCurrentUser();

  // If user is already logged in, redirect to dashboard
  if (user) {
    redirect('/dashboard');
  }

  return <SignInViewPage />;
}