'use client';

import { Doc } from '@/convex/_generated/dataModel';

/**
 * Presentation helpers for Study Center.
 *
 * Keeps formatting logic out of UI components so render code stays minimal.
 */

export function formatQuranRef(ref: Doc<'studyReferences'>) {
  const surah = ref.quranSurah;
  const start = ref.quranAyahStart;
  const end = ref.quranAyahEnd;
  if (surah === undefined || start === undefined) return 'Quran (invalid ref)';
  if (end !== undefined && end !== start) return `Quran ${surah}:${start}–${end}`;
  return `Quran ${surah}:${start}`;
}

export function formatHadithRef(ref: Doc<'studyReferences'>) {
  const collection = ref.hadithCollection ?? 'Hadith';
  const number = ref.hadithNumber ?? '—';
  return `${collection} #${number}`;
}

export function formatOtherRef(ref: Doc<'studyReferences'>) {
  if (ref.title) return ref.title;
  if (ref.url) return ref.url;
  return 'Other';
}

export function formatReferenceLabel(ref: Doc<'studyReferences'>) {
  if (ref.type === 'quran') return formatQuranRef(ref);
  if (ref.type === 'hadith') return formatHadithRef(ref);
  return formatOtherRef(ref);
}

