import { redirect } from "next/navigation";

/**
 * Login Page (Legacy - redirects to home)
 * The home page now handles login/register
 */
export default function LoginPage() {
  redirect("/");
}
