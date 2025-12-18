'use client';

import { cn } from '@/lib/utils';

type StudyListItem = {
  id: string;
  title: string;
  subtitle?: string;
  meta?: string;
  isArabic?: boolean;
};

/**
 * Shared list renderer for Words / Phrases / Verses.
 * The parent is responsible for filtering/ranking and selection state.
 */
export function StudyList({
  items,
  selectedId,
  onSelect,
}: {
  items: StudyListItem[];
  selectedId?: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="space-y-1">
      {items.map((item) => {
        const isActive = item.id === selectedId;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item.id)}
            className={cn(
              'w-full text-left rounded-md px-3 py-2 border transition-colors',
              isActive
                ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900'
            )}
          >
            <div
              className={cn(
                'font-medium leading-snug',
                item.isArabic && 'font-arabic text-right',
              )}
              dir={item.isArabic ? 'rtl' : undefined}
            >
              {item.title}
            </div>
            {(item.subtitle || item.meta) && (
              <div className="mt-1 flex items-center justify-between gap-2 text-xs text-slate-500">
                <span className="truncate">{item.subtitle ?? ''}</span>
                {item.meta ? <span className="shrink-0 font-mono">{item.meta}</span> : null}
              </div>
            )}
          </button>
        );
      })}
      {items.length === 0 ? (
        <div className="text-sm text-slate-500 border border-dashed border-slate-200 dark:border-slate-800 rounded-md p-4">
          No items yet.
        </div>
      ) : null}
    </div>
  );
}

