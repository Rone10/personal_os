'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Button } from '@/components/ui/button';
import { Check, Loader2, X } from 'lucide-react';

/**
 * Minimal flashcards for words only.
 *
 * Front: Arabic word
 * Back: primary meaning
 *
 * Notes/references are intentionally excluded to keep review lightweight.
 */
export function StudyFlashcards() {
  const cards = useQuery(api.study.listWordsForFlashcards, {});
  const reviewWord = useMutation(api.study.reviewWord);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  useEffect(() => {
    // When the card list changes (e.g. after reviewing), reset to a safe index.
    setCurrentIndex(0);
    setIsFlipped(false);
  }, [cards?.length]);

  const current = useMemo(() => {
    if (!cards || cards.length === 0) return null;
    return cards[currentIndex % cards.length] ?? null;
  }, [cards, currentIndex]);

  if (cards === undefined) {
    return (
      <div className="p-8 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!current) {
    return (
      <div className="h-64 flex items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-lg text-slate-500">
        No cards due for review.
      </div>
    );
  }

  const handleNext = async (success: boolean) => {
    const word = current.word;
    const newLevel = success ? Math.min(word.masteryLevel + 1, 5) : Math.max(word.masteryLevel - 1, 1);
    await reviewWord({ id: word._id, masteryLevel: newLevel });

    setIsFlipped(false);
    setCurrentIndex((prev) => prev + 1);
  };

  return (
    <div className="flex flex-col items-center gap-6 max-w-md mx-auto">
      <div className="w-full aspect-[3/2] perspective-1000 cursor-pointer group" onClick={() => setIsFlipped(!isFlipped)}>
        <div
          className={`relative w-full h-full transition-all duration-500 transform-style-3d ${isFlipped ? 'rotate-y-180' : ''}`}
        >
          <div className="absolute w-full h-full backface-hidden bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-xl flex flex-col items-center justify-center p-8 shadow-sm group-hover:border-emerald-500 transition-colors">
            <span className="text-4xl font-arabic mb-4" dir="rtl">
              {current.word.arabicText}
            </span>
            <span className="text-sm text-slate-400">Tap to reveal</span>
          </div>

          <div className="absolute w-full h-full backface-hidden rotate-y-180 bg-emerald-50 dark:bg-emerald-900/20 border-2 border-emerald-200 dark:border-emerald-800 rounded-xl flex flex-col items-center justify-center p-8 shadow-sm">
            <span className="text-2xl font-semibold mb-2 text-center">{current.primaryMeaning || '—'}</span>
            {current.word.root ? (
              <span className="text-sm font-mono text-emerald-600 dark:text-emerald-400">Root: {current.word.root}</span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="flex gap-4 w-full">
        <Button
          variant="outline"
          className="flex-1 border-red-200 hover:bg-red-50 hover:text-red-600 dark:border-red-900 dark:hover:bg-red-900/20"
          onClick={() => handleNext(false)}
        >
          <X className="mr-2 h-4 w-4" /> Hard
        </Button>
        <Button
          variant="outline"
          className="flex-1 border-emerald-200 hover:bg-emerald-50 hover:text-emerald-600 dark:border-emerald-900 dark:hover:bg-emerald-900/20"
          onClick={() => handleNext(true)}
        >
          <Check className="mr-2 h-4 w-4" /> Easy
        </Button>
      </div>

      <div className="text-xs text-slate-400">
        Card {Math.min(currentIndex + 1, cards.length)} of {cards.length}
      </div>
    </div>
  );
}

