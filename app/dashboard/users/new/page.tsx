import { getCurrentUser } from "@/lib/auth/jwt";
import { checkPermission } from "@/lib/auth/permissions";
import { redirect } from "next/navigation";
import { getRoles } from "@/lib/actions/roles";
import { CreateUserForm } from "@/components/users/create-user-form";

/**
 * Create User Page
 * Allows authorized users to create new users
 */
export default async function CreateUserPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const hasAccess = await checkPermission("user.create");
  if (!hasAccess) {
    redirect("/dashboard/users");
  }

  const rolesResult = await getRoles();
  const roles = rolesResult.success ? rolesResult.roles : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Create New User</h1>
        <p className="text-muted-foreground mt-2">
          Add a new user to the system and assign roles
        </p>
      </div>

      <CreateUserForm roles={roles} />
    </div>
  );
}

