import { getCurrentUser } from "@/lib/auth/jwt";
import { checkPermission } from "@/lib/auth/permissions";
import { getAuditLogs } from "@/lib/audit-log";
import { redirect } from "next/navigation";
import { LogsTable } from "@/components/logs/logs-table";
import PageContainer from "@/components/layout/page-container";

/**
 * Audit Logs Page
 * Displays system activity logs with filtering
 * Requires audit.read permission
 */
export default async function LogsPage({
  searchParams,
}: {
  searchParams: { page?: string; action?: string; resource?: string };
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  // Check permission
  const hasAccess = await checkPermission("audit.read");
  if (!hasAccess) {
    redirect("/dashboard");
  }

  const page = parseInt(searchParams.page || "1");
  const filters = {
    action: searchParams.action,
    resource: searchParams.resource,
  };

  const result = await getAuditLogs(page, 50, filters);

  return (
    <PageContainer>
      <div className='flex flex-1 flex-col space-y-2'>
      <div>
        <h1 className="text-3xl font-bold">Audit Logs</h1>
        <p className="text-muted-foreground mt-2">
          View system activity and user actions
        </p>
      </div>

      <LogsTable
        logs={result.logs}
        total={result.total}
        page={result.page}
        totalPages={result.totalPages}
      />
    </div>
    </PageContainer>
  );
}

