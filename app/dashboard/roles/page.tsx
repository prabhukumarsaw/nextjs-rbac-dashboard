import { getCurrentUser } from "@/lib/auth/jwt";
import { checkPermission } from "@/lib/auth/permissions";
import { redirect } from "next/navigation";
import { getRoles } from "@/lib/actions/roles";
import { getAssignableRoles } from "@/lib/organization/roles";
import { getCurrentOrganizationId } from "@/lib/organization/context";
import { isSuperadmin } from "@/lib/organization/validation";
import { RolesTable } from "@/components/roles/roles-table";
import { Button } from "@/components/ui/button";
import { Plus, Shield } from "lucide-react";
import Link from "next/link";
import PageContainer from "@/components/layout/page-container";
import { Alert, AlertDescription } from "@/components/ui/alert";

/**
 * Roles Management Page
 * Displays assignable roles (organizations) or all roles (superadmin)
 * Requires role.read permission
 */
export default async function RolesPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/auth/sign-in");
  }

  // Check permission
  const hasAccess = await checkPermission("role.read");
  if (!hasAccess) {
    redirect("/dashboard");
  }

  const orgId = await getCurrentOrganizationId();
  const isSuper = await isSuperadmin();
  
  // Organizations see assignable roles, superadmin sees all roles
  const result = (isSuper && orgId === null) 
    ? await getRoles() 
    : await getAssignableRoles();

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
          <h1 className="text-3xl font-bold tracking-tight">Role Management</h1>
          <p className="text-muted-foreground mt-2">
            {isSuper && orgId === null
              ? "Manage all system roles and permissions"
              : "View and assign roles to users in your organization"}
          </p>
        </div>
        {await checkPermission("role.create") && isSuper && (
          <Link href="/dashboard/roles/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Role
            </Button>
          </Link>
        )}
      </div>

      {!isSuper && (
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription>
            Organizations can only assign existing roles to users. Only superadmin can create new roles.
          </AlertDescription>
        </Alert>
      )}

      <RolesTable roles={result.success ? result.roles : []} />
    </div>
    </PageContainer>
  );
}

