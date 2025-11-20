import { getCurrentUser } from "@/lib/auth/jwt";
import { checkPermission } from "@/lib/auth/permissions";
import { getRoles } from "@/lib/actions/roles";
import { redirect } from "next/navigation";
import { RolesTable } from "@/components/roles/roles-table";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";
import PageContainer from "@/components/layout/page-container";

/**
 * Roles Management Page
 * Displays list of all roles with permissions
 * Requires role.read permission
 */
export default async function RolesPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  // Check permission
  const hasAccess = await checkPermission("role.read");
  if (!hasAccess) {
    redirect("/dashboard");
  }

  const result = await getRoles();

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
          <h1 className="text-3xl font-bold">Role Management</h1>
          <p className="text-muted-foreground mt-2">
            Configure roles and assign permissions
          </p>
        </div>
        {await checkPermission("role.create") && (
          <Link href="/dashboard/roles/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Role
            </Button>
          </Link>
        )}
      </div>

      <RolesTable roles={result.roles} />
    </div>
    </PageContainer>
  );
}

