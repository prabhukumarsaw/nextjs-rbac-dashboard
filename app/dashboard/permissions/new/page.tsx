import { getCurrentUser } from "@/lib/auth/jwt";
import { redirect } from "next/navigation";
import { isSuperadmin } from "@/lib/organization/validation";
import { getCurrentOrganizationId } from "@/lib/organization/context";
import { CreatePermissionForm } from "@/components/permissions/create-permission-form";
import PageContainer from "@/components/layout/page-container";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield } from "lucide-react";

/**
 * Create Permission Page
 * Only superadmin can create permissions
 */
export default async function CreatePermissionPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/auth/sign-in");
  }

  const isSuper = await isSuperadmin();
  if (!isSuper) {
    redirect("/dashboard/permissions");
  }

  const orgId = await getCurrentOrganizationId();

  return (
    <PageContainer>
      <div className="flex flex-1 flex-col space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Create New Permission</h1>
          <p className="text-muted-foreground mt-2">
            Define a new permission for access control
            {orgId && " for the current organization"}
          </p>
        </div>

        {orgId && (
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              This permission will be created for the current organization. Organizations can assign this permission to their roles.
            </AlertDescription>
          </Alert>
        )}

        <CreatePermissionForm />
      </div>
    </PageContainer>
  );
}

