import { getCurrentUser } from "@/lib/auth/jwt";
import { checkPermission } from "@/lib/auth/permissions";
import { getPermissionById } from "@/lib/actions/permissions";
import { redirect, notFound } from "next/navigation";
import { EditPermissionForm } from "@/components/permissions/edit-permission-form";

/**
 * Edit Permission Page
 */
export default async function EditPermissionPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const hasAccess = await checkPermission("permission.update");
  if (!hasAccess) {
    redirect("/dashboard/permissions");
  }

  const permissionResult = await getPermissionById(params.id);
  if (!permissionResult.success || !permissionResult.permission) {
    notFound();
  }

  const permission = permissionResult.permission;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Edit Permission</h1>
        <p className="text-muted-foreground mt-2">
          Update permission details
        </p>
      </div>

      <EditPermissionForm permission={permissionResult.permission} />
    </div>
  );
}

