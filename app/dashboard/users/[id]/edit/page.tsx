import { getCurrentUser } from "@/lib/auth/jwt";
import { checkPermission } from "@/lib/auth/permissions";
import { getUserById, updateUser } from "@/lib/actions/users";
import { getRoles } from "@/lib/actions/roles";
import { redirect, notFound } from "next/navigation";
import { EditUserForm } from "@/components/users/edit-user-form";

/**
 * Edit User Page
 * Allows authorized users to edit existing users
 */
export default async function EditUserPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const hasAccess = await checkPermission("user.update");
  if (!hasAccess) {
    redirect("/dashboard/users");
  }

  const [userResult, rolesResult] = await Promise.all([
    getUserById(params.id),
    getRoles(),
  ]);

  if (!userResult.success || !userResult.user) {
    notFound();
  }

  const roles = rolesResult.success ? rolesResult.roles : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Edit User</h1>
        <p className="text-muted-foreground mt-2">
          Update user information and roles
        </p>
      </div>

      <EditUserForm user={userResult.user} roles={roles} />
    </div>
  );
}

