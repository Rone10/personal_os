'use client';

import { ReactNode } from 'react';

/**
 * Shared “detail panel” chrome for the Study Center.
 *
 * Keeps the right panel consistent across words, phrases, and verse captures.
 */
export function StudyDetailShell({
  title,
  subtitle,
  actions,
  children,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="h-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-lg font-semibold leading-tight">{title}</div>
          {subtitle ? <div className="text-sm text-slate-500 mt-1">{subtitle}</div> : null}
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

