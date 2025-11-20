import { getCurrentUser } from "@/lib/auth/jwt";
import { getUserPermissions } from "@/lib/auth/permissions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Shield, Key, FileText } from "lucide-react";

/**
 * Dashboard Home Page
 * Displays overview statistics and quick access to main features
 * Uses SSR for optimal performance
 */
export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) {
    return null;
  }

  const permissions = await getUserPermissions(user.userId);

  const stats = [
    {
      title: "Users",
      description: "Manage system users",
      icon: Users,
      href: "/dashboard/users",
      permission: "user.read",
    },
    {
      title: "Roles",
      description: "Configure user roles",
      icon: Shield,
      href: "/dashboard/roles",
      permission: "role.read",
    },
    {
      title: "Permissions",
      description: "Manage permissions",
      icon: Key,
      href: "/dashboard/permissions",
      permission: "permission.read",
    },
    {
      title: "Audit Logs",
      description: "View system activity",
      icon: FileText,
      href: "/dashboard/logs",
      permission: "audit.read",
    },
  ];

  // Filter stats based on user permissions
  const accessibleStats = stats.filter(
    (stat) => !stat.permission || permissions.includes(stat.permission)
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Welcome back, {user.username}! Manage your enterprise platform from here.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {accessibleStats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <CardDescription>{stat.description}</CardDescription>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks and shortcuts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {permissions.includes("user.create") && (
                <a
                  href="/dashboard/users/new"
                  className="block p-3 rounded-lg border hover:bg-accent transition-colors"
                >
                  <p className="font-medium">Create New User</p>
                  <p className="text-sm text-muted-foreground">Add a new user to the system</p>
                </a>
              )}
              {permissions.includes("role.create") && (
                <a
                  href="/dashboard/roles/new"
                  className="block p-3 rounded-lg border hover:bg-accent transition-colors"
                >
                  <p className="font-medium">Create New Role</p>
                  <p className="text-sm text-muted-foreground">Define a new role with permissions</p>
                </a>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System Information</CardTitle>
            <CardDescription>Platform details and status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Your Role:</span>
                <span className="font-medium">{user.roles.join(", ")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Permissions:</span>
                <span className="font-medium">{permissions.length} active</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

