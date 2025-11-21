import { getCurrentUser } from "@/lib/auth/jwt";
import { checkPermission } from "@/lib/auth/permissions";
import { redirect } from "next/navigation";
import { getPermissions } from "@/lib/actions/permissions";
import { getAssignablePermissions } from "@/lib/organization/roles";
import { getCurrentOrganizationId } from "@/lib/organization/context";
import { isSuperadmin } from "@/lib/organization/validation";
import { PermissionsTable } from "@/components/permissions/permissions-table";
import { Button } from "@/components/ui/button";
import { Plus, Shield } from "lucide-react";
import Link from "next/link";
import PageContainer from "@/components/layout/page-container";
import { Alert, AlertDescription } from "@/components/ui/alert";

/**
 * Permissions Management Page
 * Displays assignable permissions (organizations) or all permissions (superadmin)
 * Requires permission.read permission
 */
export default async function PermissionsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/auth/sign-in");
  }

  // Check permission
  const hasAccess = await checkPermission("permission.read");
  if (!hasAccess) {
    redirect("/dashboard");
  }

  const orgId = await getCurrentOrganizationId();
  const isSuper = await isSuperadmin();
  
  // Organizations see assignable permissions, superadmin sees all permissions
  const result = (isSuper && orgId === null)
    ? await getPermissions()
    : await getAssignablePermissions();

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
          <h1 className="text-3xl font-bold tracking-tight">Permission Management</h1>
          <p className="text-muted-foreground mt-2">
            {isSuper && orgId === null
              ? "Manage all system permissions and access control"
              : "View permissions available for assignment in your organization"}
          </p>
        </div>
        {await checkPermission("permission.create") && isSuper && (
          <Link href="/dashboard/permissions/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Permission
            </Button>
          </Link>
        )}
      </div>

      {!isSuper && (
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription>
            Organizations can only assign existing permissions to roles. Only superadmin can create new permissions.
          </AlertDescription>
        </Alert>
      )}

      <PermissionsTable permissions={result.success ? result.permissions : []} />
    </div>
    </PageContainer>
  );
}

