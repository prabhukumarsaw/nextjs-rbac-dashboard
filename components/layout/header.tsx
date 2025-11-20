import React from 'react';

import { Separator } from '../ui/separator';
import { UserNav } from './user-nav';
import { ModeToggle } from './ThemeToggle/theme-toggle';
import CtaGithub from './cta-github';
import { ThemeSelector } from '../misc/theme-selector';
import SearchInput from '../misc/search-input';
import { SidebarTrigger } from '../ui/sidebar';
import { Breadcrumbs } from '../misc/breadcrumbs';

/**
 * Dashboard Header Component
 * Provides top navigation bar with search and notifications
 */
interface DashboardHeaderProps {
  user: {
    userId: string;
    email: string;
    username: string;
    roles: string[];
  };
}


export default function Header({ user }: DashboardHeaderProps) {
  return (
    <header className='flex h-16 shrink-0 items-center justify-between gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12'>
      <div className='flex items-center gap-2 px-4'>
        <SidebarTrigger className='-ml-1' />
        <Separator orientation='vertical' className='mr-2 h-4' />
        <Breadcrumbs />
      </div>

      <div className='flex items-center gap-2 px-4'>
        <CtaGithub />
        <div className='hidden md:flex'>
          <SearchInput />
        </div>
        <UserNav user={user} />
        <ModeToggle />
        <ThemeSelector />
      </div>
    </header>
  );
}
