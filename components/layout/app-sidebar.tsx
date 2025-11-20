'use client';

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from '@/components/ui/collapsible';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail
} from '@/components/ui/sidebar';

import { useMediaQuery } from '@/hooks/use-media-query';
import {
  IconBell,
  IconChevronRight,
  IconChevronsDown,
  IconLogout,
  IconPhotoUp,
    
} from '@tabler/icons-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import * as React from 'react';
import { logout } from "@/lib/actions/auth";
import { UserAvatarProfile } from '../misc/user-avatar-profile';
import { OrgSwitcher } from '../misc/org-switcher';
import { Icons } from '../misc/icons';

export const company = {
  name: 'Acme Inc',
  logo: IconPhotoUp,
  plan: 'Enterprise'
};

const tenants = [
  { id: '1', name: 'Acme Inc' },
  { id: '2', name: 'Beta Corp' },
  { id: '3', name: 'Gamma Ltd' }
];

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

// Map your menu icon names to Icons component
const iconMap: Record<string, React.ComponentType<any>> = {
  dashboard: Icons.dashboard,
  blogs: Icons.post,
  profile: Icons.user2,
  users: Icons.user,
  roles: Icons.settings,
  permissions: Icons.billing,
  logs: Icons.page,
  // Fallback icons for common cases
  kanban: Icons.kanban,
  product: Icons.product,
  media: Icons.media,
  employee: Icons.employee,
  settings: Icons.settings,
  billing: Icons.billing,
};

export default function AppSidebar({ menus, user }: DashboardSidebarProps) {
  const pathname = usePathname();
  const { isOpen } = useMediaQuery();
  const router = useRouter();

  // Default menu items (always visible to authenticated users)
  const defaultMenus: MenuItem[] = [
    // {
    //   id: "dashboard",
    //   name: "Dashboard",
    //   slug: "dashboard",
    //   path: "/dashboard",
    //   icon: "dashboard",
    // },
  ];

  // Merge default menus with permission-based menus and sort by order
  const allMenus = [...defaultMenus, ...menus]
    .filter(menu => menu.path) // Filter out items without paths
    .sort((a, b) => (a.order || 0) - (b.order || 0));

  const handleSwitchTenant = (_tenantId: string) => {
    // Tenant switching functionality would be implemented here
  };

  const activeTenant = tenants[0];

  React.useEffect(() => {
    // Side effects based on sidebar state changes
  }, [isOpen]);

  const renderIcon = (iconName: string | null) => {
    if (!iconName) return <Icons.dashboard className="h-5 w-5" />;
    
    const IconComponent = iconMap[iconName] || Icons.dashboard;
    return <IconComponent className="h-5 w-5" />;
  };

  const handleLogout = async () => {
    await logout();
  };

  return (
    <Sidebar collapsible='icon'>
      <SidebarHeader>
       
        <OrgSwitcher
          tenants={tenants}
          defaultTenant={activeTenant}
          onTenantSwitch={handleSwitchTenant}
        />
      </SidebarHeader>
      
      <SidebarContent className='overflow-x-hidden'>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarMenu>
            {allMenus.map((menu) => {
              const isActive = pathname === menu.path || (menu.path && pathname?.startsWith(menu.path + "/"));
              
              // Handle menu items with children
              if (menu.children && menu.children.length > 0) {
                const hasActiveChild = menu.children.some(child => 
                  pathname === child.path || (child.path && pathname?.startsWith(child.path + "/"))
                );

                return (
                  <Collapsible
                    key={menu.id}
                    asChild
                    defaultOpen={hasActiveChild}
                    className='group/collapsible'
                  >
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton
                          tooltip={menu.name}
                          isActive={isActive || hasActiveChild}
                        >
                          {renderIcon(menu.icon)}
                          <span>{menu.name}</span>
                          <IconChevronRight className='ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90' />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {menu.children.map((child) => {
                            const isChildActive = pathname === child.path || (child.path && pathname?.startsWith(child.path + "/"));
                            return (
                              <SidebarMenuSubItem key={child.id}>
                                <SidebarMenuSubButton
                                  asChild
                                  isActive={isChildActive}
                                >
                                  <Link href={child.path || '#'}>
                                    <span>{child.name}</span>
                                  </Link>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            );
                          })}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                );
              }

              // Handle single menu items without children
              return (
                <SidebarMenuItem key={menu.id}>
                  <SidebarMenuButton
                    asChild
                    tooltip={menu.name}
                    isActive={isActive}
                  >
                    <Link href={menu.path || '#'}>
                      {renderIcon(menu.icon)}
                      <span>{menu.name}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size='lg'
                  className='data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground'
                >
                  <UserAvatarProfile
                    className='h-8 w-8 rounded-lg'
                    user={user}
                  />
                  <div className="flex flex-col items-start flex-1 min-w-0">
                    <span className="text-sm font-medium truncate">{user.username}</span>
                    <span className="text-xs text-muted-foreground truncate">{user.email}</span>
                  </div>
                  <IconChevronsDown className='ml-auto size-4' />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className='w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg'
                side='bottom'
                align='end'
                sideOffset={4}
              >

                <DropdownMenuGroup>
                  <DropdownMenuItem
                    onClick={() => router.push('/dashboard/profile')}
                  >
                    <Icons.user2 className='mr-2 h-4 w-4' />
                    Profile
                  </DropdownMenuItem>
                  
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <IconLogout className='mr-2 h-4 w-4' />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}