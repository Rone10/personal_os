'use client';

import { useState } from 'react';
import { Doc } from '@/convex/_generated/dataModel';
import { Button } from '@/components/ui/button';
import { Check, X } from 'lucide-react';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';

interface FlashcardProps {
  words: Doc<"words">[];
}

export function Flashcard({ words }: FlashcardProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const reviewWord = useMutation(api.study.words.review);

  // Filter for items due for review (nextReview <= now) or low mastery
  // For now, just cycle through all provided
  const currentCard = words[currentIndex];

  if (!currentCard) {
    return (
      <div className="h-64 flex items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-lg text-slate-500">
        No cards to review!
      </div>
    );
  }

  const handleNext = (success: boolean) => {
    reviewWord({ id: currentCard._id as Id<"words">, success });

    setIsFlipped(false);
    setCurrentIndex((prev) => (prev + 1) % words.length);
  };

  const primaryMeaning = currentCard.meanings[0]?.definition ?? "No definition";

  return (
    <div className="flex flex-col items-center gap-6 max-w-md mx-auto">
      <div
        className="w-full aspect-[3/2] perspective-1000 cursor-pointer group"
        onClick={() => setIsFlipped(!isFlipped)}
      >
        <div className={`relative w-full h-full transition-all duration-500 transform-style-3d ${isFlipped ? 'rotate-y-180' : ''}`}>
          {/* Front */}
          <div className="absolute w-full h-full backface-hidden bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-xl flex flex-col items-center justify-center p-8 shadow-sm group-hover:border-emerald-500 transition-colors">
            <span className="text-4xl font-arabic mb-4">{currentCard.text}</span>
            <span className="text-sm text-slate-400">Tap to reveal</span>
          </div>

          {/* Back */}
          <div className="absolute w-full h-full backface-hidden rotate-y-180 bg-emerald-50 dark:bg-emerald-900/20 border-2 border-emerald-200 dark:border-emerald-800 rounded-xl flex flex-col items-center justify-center p-8 shadow-sm">
            <span className="text-2xl font-semibold mb-2">{primaryMeaning}</span>
            {currentCard.transliteration && (
              <span className="text-sm font-mono text-emerald-600 dark:text-emerald-400">{currentCard.transliteration}</span>
            )}
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
        Card {currentIndex + 1} of {words.length}
      </div>
    </div>
  );
}
