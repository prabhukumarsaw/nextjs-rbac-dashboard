import { getCurrentUser } from "@/lib/auth/jwt";
import { redirect } from "next/navigation";
import { getProfile } from "@/lib/actions/profile";
import { ProfileForm } from "@/components/profile/profile-form";

/**
 * Profile Page
 * Allows users to update their profile and change password
 */
export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const profileResult = await getProfile();

  if (!profileResult.success || !profileResult.user) {
    return (
      <div className="p-6">
        <p className="text-destructive">Failed to load profile</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">My Profile</h1>
        <p className="text-muted-foreground mt-2">
          Manage your account settings and preferences
        </p>
      </div>

      <ProfileForm user={profileResult.user} />
    </div>
  );
}

