import { getCurrentUser } from "@/lib/auth/jwt";
import { checkPermission } from "@/lib/auth/permissions";
import { getUsers } from "@/lib/actions/users";
import { redirect } from "next/navigation";
import { UsersTable } from "@/components/users/users-table";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";
import PageContainer from "@/components/layout/page-container";

/**
 * Users Management Page
 * Displays list of all users with pagination and search
 * Requires user.read permission
 */
export default async function UsersPage({
  searchParams,
}: {
  searchParams: { page?: string; search?: string };
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  // Check permission
  const hasAccess = await checkPermission("user.read");
  if (!hasAccess) {
    redirect("/dashboard");
  }

  const page = parseInt(searchParams.page || "1");
  const search = searchParams.search;

  const result = await getUsers(page, 10, search);

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
          <h1 className="text-3xl font-bold">User Management</h1>
          <p className="text-muted-foreground mt-2">
            Manage system users, roles, and permissions
          </p>
        </div>
        {await checkPermission("user.create") && (
          <Link href="/dashboard/users/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create User
            </Button>
          </Link>
        )}
      </div>

      <UsersTable
        users={result.users}
        total={result.total}
        page={result.page}
        totalPages={result.totalPages}
        search={search}
      />
    </div>
    </PageContainer>
  );
}

