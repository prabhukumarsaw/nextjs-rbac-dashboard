import { getCurrentUser } from "@/lib/auth/jwt";
import { checkPermission } from "@/lib/auth/permissions";
import { getRoleById } from "@/lib/actions/roles";
import { getPermissions } from "@/lib/actions/permissions";
import { getMenus } from "@/lib/actions/menus";
import { redirect, notFound } from "next/navigation";
import { EditRoleForm } from "@/components/roles/edit-role-form";

/**
 * Edit Role Page
 */
export default async function EditRolePage({
  params,
}: {
  params: { id: string };
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const hasAccess = await checkPermission("role.update");
  if (!hasAccess) {
    redirect("/dashboard/roles");
  }

  const [roleResult, permissionsResult, menusResult] = await Promise.all([
    getRoleById(params.id),
    getPermissions(),
    getMenus(),
  ]);

  if (!roleResult.success || !roleResult.role) {
    notFound();
  }

  const permissions = permissionsResult.success ? permissionsResult.permissions : [];
  const menus = menusResult.success ? menusResult.menus : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Edit Role</h1>
        <p className="text-muted-foreground mt-2">
          Update role permissions and menu access
        </p>
      </div>

      <EditRoleForm role={roleResult.role} permissions={permissions} menus={menus} />
    </div>
  );
}

