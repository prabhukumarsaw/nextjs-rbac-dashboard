import { getCurrentUser } from "@/lib/auth/jwt";
import { checkPermission } from "@/lib/auth/permissions";
import { redirect } from "next/navigation";
import { getAssignableRoles } from "@/lib/organization/roles";
import { getCurrentOrganizationId } from "@/lib/organization/context";
import { CreateUserForm } from "@/components/users/create-user-form";
import PageContainer from "@/components/layout/page-container";

/**
 * Create User Page
 * Allows authorized users to add users to organization
 */
export default async function CreateUserPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/auth/sign-in");
  }

  const hasAccess = await checkPermission("user.create");
  if (!hasAccess) {
    redirect("/dashboard/users");
  }

  const orgId = await getCurrentOrganizationId();
  if (!orgId) {
    redirect("/dashboard/users");
  }

  const rolesResult = await getAssignableRoles();
  const roles = rolesResult.success ? rolesResult.roles : [];

  return (
    <PageContainer>
      <div className="flex flex-1 flex-col space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Add User to Organization</h1>
          <p className="text-muted-foreground mt-2">
            Add a new user to your organization and assign roles
          </p>
        </div>

        <CreateUserForm roles={roles} />
      </div>
    </PageContainer>
  );
}

