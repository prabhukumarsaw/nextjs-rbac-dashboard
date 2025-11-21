import { getCurrentUser } from "@/lib/auth/jwt";
import { checkPermission } from "@/lib/auth/permissions";
import { getUserById } from "@/lib/actions/users";
import { getAssignableRoles } from "@/lib/organization/roles";
import { getCurrentOrganizationId } from "@/lib/organization/context";
import { redirect, notFound } from "next/navigation";
import { EditUserForm } from "@/components/users/edit-user-form";
import PageContainer from "@/components/layout/page-container";

/**
 * Edit User Page
 * Allows authorized users to edit existing users in organization
 */
export default async function EditUserPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/auth/sign-in");
  }

  const hasAccess = await checkPermission("user.update");
  if (!hasAccess) {
    redirect("/dashboard/users");
  }

  const orgId = await getCurrentOrganizationId();
  if (!orgId) {
    redirect("/dashboard/users");
  }

  const [userResult, rolesResult] = await Promise.all([
    getUserById(params.id),
    getAssignableRoles(),
  ]);

  if (!userResult.success || !userResult.user) {
    notFound();
  }

  const roles = rolesResult.success ? rolesResult.roles : [];

  return (
    <PageContainer>
      <div className="flex flex-1 flex-col space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Edit User</h1>
          <p className="text-muted-foreground mt-2">
            Update user information and assign roles in your organization
          </p>
        </div>

        <EditUserForm user={userResult.user} roles={roles} />
      </div>
    </PageContainer>
  );
}

