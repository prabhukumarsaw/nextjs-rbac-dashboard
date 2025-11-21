/**
 * Example Dashboard Page with Organization-Aware Statistics
 * 
 * This example shows how to use organization context in dashboard pages
 * - Shows organization-specific data when org selected
 * - Shows aggregated data when superadmin views "All Organizations"
 */

import { getDashboardStats } from "@/lib/organization/stats";
import { getCurrentOrganizationId } from "@/lib/organization/context";
import { isSuperadmin } from "@/lib/organization/validation";

export default async function OverviewPage() {
  const [stats, orgId, isSuper] = await Promise.all([
    getDashboardStats(),
    getCurrentOrganizationId(),
    isSuperadmin(),
  ]);

  return (
    <div className="space-y-6">
      {/* Header with Organization Context */}
      <div>
        <h1 className="text-3xl font-bold">
          {stats.isAllOrganizations 
            ? "System Overview" 
            : `${stats.organizationName} Dashboard`}
        </h1>
        <p className="text-muted-foreground">
          {stats.isAllOrganizations
            ? "Aggregated statistics across all organizations"
            : `Statistics for ${stats.organizationName}`}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Users"
          value={stats.totalUsers}
          description={stats.isAllOrganizations ? "Across all organizations" : "In this organization"}
        />
        <StatCard
          title="Active Users"
          value={stats.activeUsers}
          description={`${stats.inactiveUsers} inactive`}
        />
        <StatCard
          title="Roles"
          value={stats.totalRoles}
          description="Available roles"
        />
        <StatCard
          title="Blogs"
          value={stats.totalBlogs}
          description={`${stats.publishedBlogs} published`}
        />
      </div>

      {/* Organization Context Info */}
      {isSuper && (
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">
            {orgId === null
              ? "Viewing aggregated data from all organizations"
              : `Viewing data for organization: ${stats.organizationName}`}
          </p>
        </div>
      )}
    </div>
  );
}

function StatCard({ 
  title, 
  value, 
  description 
}: { 
  title: string; 
  value: number; 
  description: string;
}) {
  return (
    <div className="rounded-lg border p-6">
      <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
      <p className="text-2xl font-bold mt-2">{value.toLocaleString()}</p>
      <p className="text-xs text-muted-foreground mt-1">{description}</p>
    </div>
  );
}

