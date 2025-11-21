import { getCurrentUser } from "@/lib/auth/jwt";
import { redirect } from "next/navigation";
import { getOrganizations } from "@/lib/organization/actions";
import { isSuperadmin } from "@/lib/organization/validation";
import { Button } from "@/components/ui/button";
import { Plus, Building2 } from "lucide-react";
import Link from "next/link";
import PageContainer from "@/components/layout/page-container";
import { OrganizationsTable } from "@/components/organizations/organizations-table";

/**
 * Organizations Management Page
 * Only superadmin can access this page
 */
export default async function OrganizationsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/auth/sign-in");
  }

  // Only superadmin can manage organizations
  const isSuper = await isSuperadmin();
  if (!isSuper) {
    redirect("/dashboard");
  }

  const result = await getOrganizations();

  if (!result.success) {
    return (
      <PageContainer>
        <div className="p-6">
          <p className="text-destructive">{result.error}</p>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="flex flex-1 flex-col space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Organizations</h1>
            <p className="text-muted-foreground mt-2">
              Manage organizations and their settings
            </p>
          </div>
          <Link href="/dashboard/organizations/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Organization
            </Button>
          </Link>
        </div>

        {result.organizations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 border rounded-lg">
            <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No organizations</h3>
            <p className="text-muted-foreground text-center mb-4">
              Get started by creating your first organization
            </p>
            <Link href="/dashboard/organizations/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Organization
              </Button>
            </Link>
          </div>
        ) : (
          <OrganizationsTable organizations={result.organizations} />
        )}
      </div>
    </PageContainer>
  );
}

