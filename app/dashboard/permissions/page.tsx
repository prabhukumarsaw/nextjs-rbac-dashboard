import { getCurrentUser } from "@/lib/auth/jwt";
import { checkPermission } from "@/lib/auth/permissions";
import { getPermissions } from "@/lib/actions/permissions";
import { redirect } from "next/navigation";
import { PermissionsTable } from "@/components/permissions/permissions-table";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";
import PageContainer from "@/components/layout/page-container";

/**
 * Permissions Management Page
 * Displays list of all permissions grouped by resource
 * Requires permission.read permission
 */
export default async function PermissionsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  // Check permission
  const hasAccess = await checkPermission("permission.read");
  if (!hasAccess) {
    redirect("/dashboard");
  }

  const result = await getPermissions();

  if (!result.success) {
    return (
      <div className="p-6">
        <p className="text-destructive">{result.error}</p>
      </div>
    );
  }

  return (
    <PageContainer>
      <div className='flex flex-1 flex-col space-y-2'>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Permission Management</h1>
          <p className="text-muted-foreground mt-2">
            Manage system permissions and access control
          </p>
        </div>
        {await checkPermission("permission.create") && (
          <Link href="/dashboard/permissions/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Permission
            </Button>
          </Link>
        )}
      </div>

      <PermissionsTable permissions={result.permissions} />
    </div>
    </PageContainer>
  );
}

