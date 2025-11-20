import { getCurrentUser } from "@/lib/auth/jwt";
import { checkPermission } from "@/lib/auth/permissions";
import { redirect } from "next/navigation";
import { getPermissions } from "@/lib/actions/permissions";
import { getMenus } from "@/lib/actions/menus";
import { CreateRoleForm } from "@/components/roles/create-role-form";

/**
 * Create Role Page
 * Allows authorized users to create new roles
 */
export default async function CreateRolePage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const hasAccess = await checkPermission("role.create");
  if (!hasAccess) {
    redirect("/dashboard/roles");
  }

  const [permissionsResult, menusResult] = await Promise.all([
    getPermissions(),
    getMenus(),
  ]);

  const permissions = permissionsResult.success ? permissionsResult.permissions : [];
  const menus = menusResult.success ? menusResult.menus : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Create New Role</h1>
        <p className="text-muted-foreground mt-2">
          Define a new role with permissions and menu access
        </p>
      </div>

      <CreateRoleForm permissions={permissions} menus={menus} />
    </div>
  );
}

