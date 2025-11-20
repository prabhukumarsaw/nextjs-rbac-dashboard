"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Users, Shield, Key, FileText, LogOut, Menu, BookOpen, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { logout } from "@/lib/actions/auth";

/**
 * Dashboard Sidebar Component
 * Displays navigation menu based on user permissions
 */
interface MenuItem {
  id: string;
  name: string;
  slug: string;
  path: string | null;
  icon: string | null;
  children?: MenuItem[];
  order?: number;
}

interface DashboardSidebarProps {
  menus: MenuItem[];
  user: {
    userId: string;
    email: string;
    username: string;
    roles: string[];
  };
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  dashboard: LayoutDashboard,
  blogs: BookOpen,
  profile: User,
  users: Users,
  roles: Shield,
  permissions: Key,
  logs: FileText,
};

export function DashboardSidebar({ menus, user }: DashboardSidebarProps) {
  const pathname = usePathname();

  // Default menu items (always visible to authenticated users)
  const defaultMenus: MenuItem[] = [
    {
      id: "dashboard",
      name: "Dashboard",
      slug: "dashboard",
      path: "/dashboard",
      icon: "dashboard",
    },
  ];

  // Merge default menus with permission-based menus
  const allMenus = [...defaultMenus, ...menus].sort((a, b) => (a.order || 0) - (b.order || 0));

  const renderIcon = (iconName: string | null) => {
    if (!iconName) return null;
    const IconComponent = iconMap[iconName] || Menu;
    return <IconComponent className="h-5 w-5" />;
  };

  return (
    <aside className="w-64 border-r bg-white dark:bg-slate-800 flex flex-col">
      <div className="p-6 border-b">
        <h1 className="text-xl font-bold">Enterprise Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">{user.email}</p>
      </div>
      <nav className="flex-1 overflow-y-auto p-4 space-y-1">
        {allMenus.map((menu) => {
          if (!menu.path) return null;
          const isActive = pathname === menu.path || pathname?.startsWith(menu.path + "/");
          return (
            <Link
              key={menu.id}
              href={menu.path}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              {renderIcon(menu.icon)}
              <span>{menu.name}</span>
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t">
        <form action={logout}>
          <Button type="submit" variant="ghost" className="w-full justify-start">
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </form>
      </div>
    </aside>
  );
}

