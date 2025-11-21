import { getCurrentUser } from "@/lib/auth/jwt";
import { checkPermission } from "@/lib/auth/permissions";
import { redirect } from "next/navigation";
import { getPermissions } from "@/lib/actions/permissions";
import { getMenus } from "@/lib/actions/menus";
import { getCurrentOrganizationId } from "@/lib/organization/context";
import { isSuperadmin } from "@/lib/organization/validation";
import { CreateRoleForm } from "@/components/roles/create-role-form";
import PageContainer from "@/components/layout/page-container";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield } from "lucide-react";

/**
 * Create Role Page
 * Only superadmin can create roles
 */
export default async function CreateRolePage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/auth/sign-in");
  }

  const isSuper = await isSuperadmin();
  if (!isSuper) {
    redirect("/dashboard/roles");
  }

  const orgId = await getCurrentOrganizationId();
  const [permissionsResult, menusResult] = await Promise.all([
    getPermissions(),
    getMenus(),
  ]);

  const permissions = permissionsResult.success ? permissionsResult.permissions : [];
  const menus = menusResult.success ? menusResult.menus : [];

  return (
    <PageContainer>
      <div className="flex flex-1 flex-col space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Create New Role</h1>
          <p className="text-muted-foreground mt-2">
            Define a new role with permissions and menu access
            {orgId && " for the current organization"}
          </p>
        </div>

        {orgId && (
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              This role will be created for the current organization. Organizations can assign this role to their users.
            </AlertDescription>
          </Alert>
        )}

        <CreateRoleForm permissions={permissions} menus={menus} />
      </div>
    </PageContainer>
  );
}

