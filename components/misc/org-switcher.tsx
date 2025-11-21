'use client';

import { Check, ChevronsUpDown, Building2, Globe } from 'lucide-react';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem
} from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  logo?: string | null;
}

interface OrgSwitcherProps {
  organizations: Organization[];
  currentOrganizationId: string | null;
  isSuperadmin: boolean;
  onSwitch?: (organizationId: string | null) => void;
}

export function OrgSwitcher({
  organizations,
  currentOrganizationId,
  isSuperadmin,
  onSwitch
}: OrgSwitcherProps) {
  const router = useRouter();
  const [isSwitching, setIsSwitching] = React.useState(false);

  const currentOrg = organizations.find(org => org.id === currentOrganizationId);
  const displayName = currentOrg?.name || (isSuperadmin ? 'All Organizations' : 'Select Organization');

  const handleSwitch = async (organizationId: string | null) => {
    if (isSwitching) return;
    
    setIsSwitching(true);
    try {
      // Call API to switch organization
      const response = await fetch('/api/organization/switch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ organizationId }),
      });

      const result = await response.json();

      if (result.success) {
        // Call optional callback
        if (onSwitch) {
          onSwitch(organizationId);
        }
        // Refresh the page to update all data
        router.refresh();
      } else {
        console.error('Failed to switch organization:', result.error);
        // You could show a toast notification here
      }
    } catch (error) {
      console.error('Error switching organization:', error);
    } finally {
      setIsSwitching(false);
    }
  };

  // Show "All Organizations" option only for superadmin
  const allOrgsOption = isSuperadmin ? (
    <React.Fragment key="all">
      <DropdownMenuItem
        onSelect={() => handleSwitch(null)}
        disabled={isSwitching}
        className={cn(
          "cursor-pointer",
          currentOrganizationId === null && "bg-accent"
        )}
      >
        <Globe className="mr-2 h-4 w-4" />
        <span>All Organizations</span>
        {currentOrganizationId === null && (
          <Check className="ml-auto h-4 w-4" />
        )}
      </DropdownMenuItem>
      <DropdownMenuSeparator />
    </React.Fragment>
  ) : null;

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild disabled={isSwitching}>
            <SidebarMenuButton
              size='lg'
              className='data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground'
              disabled={isSwitching}
            >
              <div className='bg-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg'>
                {currentOrganizationId === null ? (
                  <Globe className='size-4' />
                ) : (
                  <Building2 className='size-4' />
                )}
              </div>
              <div className='flex flex-col gap-0.5 leading-none min-w-0 flex-1'>
                <span className='font-semibold text-sm truncate'>
                  {isSuperadmin && currentOrganizationId === null ? 'System' : 'Organization'}
                </span>
                <span className='text-xs text-muted-foreground truncate'>
                  {displayName}
                </span>
              </div>
              <ChevronsUpDown className='ml-auto h-4 w-4 shrink-0' />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className='w-[--radix-dropdown-menu-trigger-width] min-w-[200px]'
            align='start'
          >
            <DropdownMenuLabel>Switch Organization</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {allOrgsOption}
            {organizations.length === 0 ? (
              <DropdownMenuItem disabled>
                <span className='text-muted-foreground text-sm'>No organizations available</span>
              </DropdownMenuItem>
            ) : (
              organizations.map((org) => (
                <DropdownMenuItem
                  key={org.id}
                  onSelect={() => handleSwitch(org.id)}
                  disabled={isSwitching}
                  className={cn(
                    "cursor-pointer",
                    currentOrganizationId === org.id && "bg-accent"
                  )}
                >
                  <Building2 className="mr-2 h-4 w-4" />
                  <span className="truncate">{org.name}</span>
                  {currentOrganizationId === org.id && (
                    <Check className="ml-auto h-4 w-4 shrink-0" />
                  )}
                </DropdownMenuItem>
              ))
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
