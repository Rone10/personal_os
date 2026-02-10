'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import {
  LayoutGrid,
  Flag,
  Users,
  Tag,
  X,
  ChevronDown,
  Filter,
} from 'lucide-react';
import { KanbanFilters, KanbanViewMode } from '@/components/KanbanBoard';

interface KanbanFilterBarProps {
  filters: KanbanFilters;
  onFiltersChange: (filters: KanbanFilters) => void;
  viewMode: KanbanViewMode;
  onViewModeChange: (mode: KanbanViewMode) => void;
  availableAssignees: string[];
  availableTags: string[];
}

export function KanbanFilterBar({
  filters,
  onFiltersChange,
  viewMode,
  onViewModeChange,
  availableAssignees,
  availableTags,
}: KanbanFilterBarProps) {
  const activeFilterCount =
    filters.assignees.size + filters.tags.size;

  const toggleAssignee = (assignee: string) => {
    const next = new Set(filters.assignees);
    if (next.has(assignee)) {
      next.delete(assignee);
    } else {
      next.add(assignee);
    }
    onFiltersChange({ ...filters, assignees: next });
  };

  const toggleTag = (tag: string) => {
    const next = new Set(filters.tags);
    if (next.has(tag)) {
      next.delete(tag);
    } else {
      next.add(tag);
    }
    onFiltersChange({ ...filters, tags: next });
  };

  const clearAllFilters = () => {
    onFiltersChange({
      assignees: new Set(),
      tags: new Set(),
    });
  };

  const clearAssigneeFilters = () => {
    onFiltersChange({ ...filters, assignees: new Set() });
  };

  const clearTagFilters = () => {
    onFiltersChange({ ...filters, tags: new Set() });
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-500" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            View & Filters
          </span>
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
              {activeFilterCount} active
            </Badge>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex items-center rounded-lg border border-slate-200 dark:border-slate-700 p-0.5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onViewModeChange('status')}
              className={cn(
                'h-7 px-3 rounded-md transition-colors',
                viewMode === 'status'
                  ? 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
              )}
            >
              <LayoutGrid className="h-3.5 w-3.5 mr-1.5" />
              Status
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onViewModeChange('priority')}
              className={cn(
                'h-7 px-3 rounded-md transition-colors',
                viewMode === 'priority'
                  ? 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
              )}
            >
              <Flag className="h-3.5 w-3.5 mr-1.5" />
              Priority
            </Button>
          </div>

          {/* Divider */}
          <div className="h-6 w-px bg-slate-200 dark:bg-slate-700" />

          {/* Assignee Filter */}
          <FilterPopover
            icon={<Users className="h-3.5 w-3.5" />}
            label="Assignee"
            items={availableAssignees}
            selectedItems={filters.assignees}
            onToggle={toggleAssignee}
            onClear={clearAssigneeFilters}
            emptyMessage="No assignees found in tasks"
          />

          {/* Tag Filter */}
          <FilterPopover
            icon={<Tag className="h-3.5 w-3.5" />}
            label="Tags"
            items={availableTags}
            selectedItems={filters.tags}
            onToggle={toggleTag}
            onClear={clearTagFilters}
            emptyMessage="No tags found in tasks"
          />

          {/* Clear All */}
          {activeFilterCount > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="h-7 px-2 text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400"
            >
              <X className="h-3.5 w-3.5 mr-1" />
              Clear all
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

interface FilterPopoverProps {
  icon: React.ReactNode;
  label: string;
  items: string[];
  selectedItems: Set<string>;
  onToggle: (item: string) => void;
  onClear: () => void;
  emptyMessage: string;
}

function FilterPopover({
  icon,
  label,
  items,
  selectedItems,
  onToggle,
  onClear,
  emptyMessage,
}: FilterPopoverProps) {
  const hasSelection = selectedItems.size > 0;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn(
            'h-7 px-2 text-xs',
            hasSelection &&
              'border-primary bg-primary/5 text-primary dark:border-primary dark:bg-primary/10'
          )}
        >
          {icon}
          <span className="ml-1.5">{label}</span>
          {hasSelection && (
            <Badge
              variant="secondary"
              className="ml-1.5 h-4 px-1 text-[10px] bg-primary/20 text-primary"
            >
              {selectedItems.size}
            </Badge>
          )}
          <ChevronDown className="ml-1.5 h-3 w-3 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-0" align="start">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-3 py-2">
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            {label}
          </span>
          {hasSelection && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClear}
              className="h-5 px-1.5 text-[10px] text-slate-500 hover:text-red-600"
            >
              Clear
            </Button>
          )}
        </div>
        <div className="max-h-48 overflow-y-auto p-2">
          {items.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">
              {emptyMessage}
            </p>
          ) : (
            <div className="space-y-1">
              {items.map((item) => (
                <label
                  key={item}
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <Checkbox
                    checked={selectedItems.has(item)}
                    onCheckedChange={() => onToggle(item)}
                    className="h-3.5 w-3.5"
                  />
                  <span className="text-sm text-slate-700 dark:text-slate-300 truncate">
                    {item}
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
