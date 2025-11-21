import { getCurrentUser } from "@/lib/auth/jwt";
import { redirect, notFound } from "next/navigation";
import { isSuperadmin } from "@/lib/organization/validation";
import { prisma } from "@/lib/prisma";
import PageContainer from "@/components/layout/page-container";
import { EditOrganizationForm } from "@/components/organizations/edit-organization-form";

/**
 * Edit Organization Page
 * Only superadmin can edit organizations
 */
export default async function EditOrganizationPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/auth/sign-in");
  }

  const isSuper = await isSuperadmin();
  if (!isSuper) {
    redirect("/dashboard/organizations");
  }

  const organization = await prisma.organization.findUnique({
    where: { id: params.id },
  });

  if (!organization) {
    notFound();
  }

  return (
    <PageContainer>
      <div className="flex flex-1 flex-col space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Edit Organization</h1>
          <p className="text-muted-foreground mt-2">
            Update organization information and settings
          </p>
        </div>

        <EditOrganizationForm organization={organization} />
      </div>
    </PageContainer>
  );
}

