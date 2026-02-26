'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  Lightbulb,
  BookOpen,
  Terminal,
  Bug,
  LogOut,
  User as UserIcon,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { useAuth } from '@workos-inc/authkit-nextjs/components';

const navItems = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Projects', href: '/projects', icon: FolderKanban },
  { name: 'Ideas', href: '/ideas', icon: Lightbulb },
  { name: 'Tasks', href: '/tasks', icon: CheckSquare },
  { name: 'Study', href: '/study', icon: BookOpen },
  { name: 'Prompts', href: '/prompts', icon: Terminal },
  { name: 'Bugs', href: '/bugs', icon: Bug },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isHovering, setIsHovering] = useState(false);

  const isCompact = isCollapsed && !isHovering;

  useEffect(() => {
    const stored = window.localStorage.getItem('sidebar-collapsed');
    if (stored === 'true') {
      setIsCollapsed(true);
    }
  }, []);

  function toggleSidebar() {
    setIsCollapsed((previous) => {
      const next = !previous;
      window.localStorage.setItem('sidebar-collapsed', String(next));
      return next;
    });
  }

  return (
    <div
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      className={cn(
        'hidden md:flex h-screen flex-col border-r bg-slate-50/50 dark:bg-slate-950/50 transition-all duration-200',
        isCompact ? 'w-16' : 'w-64',
      )}
    >
      <div
        className={cn(
          'flex items-center border-b',
          isCompact ? 'p-2 flex-col gap-2' : 'p-4 justify-between',
        )}
      >
        <h1
          className={cn(
            'font-bold tracking-tight flex items-center gap-2 min-w-0',
            isCompact ? 'text-sm' : 'text-xl',
          )}
        >
          <div className="h-6 w-6 rounded bg-slate-900 dark:bg-slate-50 shrink-0" />
          {!isCompact && <span className="truncate">Personal OS</span>}
        </h1>

        <button
          type="button"
          onClick={toggleSidebar}
          className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-slate-100"
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? (
            <PanelLeftOpen className="h-4 w-4" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
        </button>
      </div>

      <nav className={cn('flex-1 space-y-1', isCompact ? 'px-2 py-2' : 'px-4 py-3')}>
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center text-sm font-medium rounded-md transition-colors',
                isCompact ? 'justify-center px-2 py-2.5' : 'gap-3 px-3 py-2',
                isActive
                  ? 'bg-slate-200 text-slate-900 dark:bg-slate-800 dark:text-slate-50'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-50'
              )}
              title={isCompact ? item.name : undefined}
            >
              <item.icon className="h-4 w-4" />
              {!isCompact && item.name}
            </Link>
          );
        })}
      </nav>

      <div className={cn('border-t', isCompact ? 'p-2' : 'p-4')}>
        {user ? (
          <div className={cn('flex items-center', isCompact ? 'justify-center' : 'gap-3 px-2')}>
            <div className="h-8 w-8 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center">
              {user.profilePictureUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.profilePictureUrl} alt="User" className="h-8 w-8 rounded-full" />
              ) : (
                <UserIcon className="h-4 w-4 text-slate-500" />
              )}
            </div>
            {isCompact ? (
              <button
                type="button"
                onClick={() => signOut()}
                className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-300"
                title="Sign out"
                aria-label="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            ) : (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user.firstName || 'User'}</p>
                <button
                  onClick={() => signOut()}
                  className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 flex items-center gap-1"
                >
                  <LogOut className="h-3 w-3" /> Sign out
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className={cn(isCompact ? 'flex justify-center' : 'px-2')}>
            <Link
              href="/sign-in"
              className="text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-50"
              title={isCompact ? 'Sign In' : undefined}
            >
              {isCompact ? <UserIcon className="h-4 w-4" /> : 'Sign In'}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
