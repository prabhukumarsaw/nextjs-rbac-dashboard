import { getCurrentUser } from "@/lib/auth/jwt";
import { redirect } from "next/navigation";
import { isSuperadmin } from "@/lib/organization/validation";
import PageContainer from "@/components/layout/page-container";
import { CreateOrganizationForm } from "@/components/organizations/create-organization-form";

/**
 * Create Organization Page
 * Only superadmin can create organizations
 */
export default async function CreateOrganizationPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/auth/sign-in");
  }

  const isSuper = await isSuperadmin();
  if (!isSuper) {
    redirect("/dashboard/organizations");
  }

  return (
    <PageContainer>
      <div className="flex flex-1 flex-col space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Create Organization</h1>
          <p className="text-muted-foreground mt-2">
            Create a new organization with its own users, roles, and permissions
          </p>
        </div>

        <CreateOrganizationForm />
      </div>
    </PageContainer>
  );
}

