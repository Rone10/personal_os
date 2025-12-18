'use client';

import { Input } from '@/components/ui/input';

/**
 * Minimal controlled search input for the Study Center.
 *
 * Search behavior (Arabic normalization + fuzzy English) is implemented
 * in Step 5; this component is intentionally “dumb”.
 */
export function StudySearchBar({
  value,
  onChange,
  placeholder = 'Search saved words, phrases, verses…',
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
}) {
  return (
    <Input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="h-10"
    />
  );
}

