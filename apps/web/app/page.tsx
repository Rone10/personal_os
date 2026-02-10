'use client';

import { useAuth } from '@workos-inc/authkit-nextjs/components';
import { TodayFocus } from './_components/TodayFocus';
import { QuickStats } from './_components/QuickStats';
import { RecentVocab } from './_components/RecentVocab';

export default function Dashboard() {
  const { user } = useAuth();

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back, {user?.firstName || 'User'}. Here is your overview.</p>
      </div>

      <QuickStats />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <TodayFocus />
        <RecentVocab />
      </div>
    </div>
  );
}

