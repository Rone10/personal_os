"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  Loader2,
  RotateCcw,
  ThumbsUp,
  ThumbsDown,
  Sparkles,
  CheckCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ArabicText } from "@/components/ui/arabic-text";
import { cn } from "@/lib/utils";

export default function FlashcardsView() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [sessionComplete, setSessionComplete] = useState(false);

  // Get due words
  const dueWords = useQuery(api.study.words.listDue);
  const reviewWord = useMutation(api.study.words.review);

  const handleReview = async (success: boolean) => {
    if (!dueWords || currentIndex >= dueWords.length) return;

    const word = dueWords[currentIndex];
    await reviewWord({ id: word._id as Id<"words">, success });

    if (currentIndex + 1 >= dueWords.length) {
      setSessionComplete(true);
    } else {
      setCurrentIndex(currentIndex + 1);
      setShowAnswer(false);
    }
  };

  const resetSession = () => {
    setCurrentIndex(0);
    setShowAnswer(false);
    setSessionComplete(false);
  };

  // Loading state
  if (dueWords === undefined) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  // No words due
  if (dueWords.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center">
        <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
          All caught up!
        </h2>
        <p className="text-slate-500 max-w-md">
          You have no words due for review right now. Come back later or add more
          vocabulary to study.
        </p>
      </div>
    );
  }

  // Session complete
  if (sessionComplete) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center">
        <Sparkles className="h-16 w-16 text-yellow-500 mb-4" />
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
          Session Complete!
        </h2>
        <p className="text-slate-500 mb-6">
          You reviewed {dueWords.length} words. Great work!
        </p>
        <Button onClick={resetSession}>
          <RotateCcw className="h-4 w-4 mr-2" />
          Review Again
        </Button>
      </div>
    );
  }

  const currentWord = dueWords[currentIndex];
  const primaryMeaning = currentWord.meanings[0]?.definition ?? "No definition";

  return (
    <div className="h-full flex flex-col items-center justify-center p-8">
      {/* Progress */}
      <div className="w-full max-w-md mb-8">
        <div className="flex items-center justify-between text-sm text-slate-500 mb-2">
          <span>Progress</span>
          <span>
            {currentIndex + 1} / {dueWords.length}
          </span>
        </div>
        <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 transition-all"
            style={{ width: `${((currentIndex + 1) / dueWords.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Flashcard */}
      <div
        onClick={() => setShowAnswer(!showAnswer)}
        className={cn(
          "w-full max-w-md aspect-[3/2] bg-white dark:bg-slate-800 rounded-2xl border-2 cursor-pointer transition-all duration-300 shadow-lg",
          showAnswer
            ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
            : "border-slate-200 dark:border-slate-700 hover:border-slate-300"
        )}
        style={{
          perspective: "1000px",
        }}
      >
        <div className="h-full flex flex-col items-center justify-center p-8">
          {!showAnswer ? (
            // Front - Arabic word
            <>
              <ArabicText
                variant="word"
                size="3xl"
                as="p"
                className="text-center mb-4"
              >
                {currentWord.text}
              </ArabicText>
              {currentWord.transliteration && (
                <p className="text-lg text-slate-400">
                  {currentWord.transliteration}
                </p>
              )}
              <p className="text-sm text-slate-400 mt-4">
                Tap to reveal answer
              </p>
            </>
          ) : (
            // Back - Meaning
            <>
              <p className="text-2xl font-medium text-center text-slate-900 dark:text-slate-100 mb-4">
                {primaryMeaning}
              </p>
              {currentWord.type && (
                <span className="text-sm bg-slate-100 dark:bg-slate-700 px-3 py-1 rounded">
                  {currentWord.type}
                </span>
              )}
            </>
          )}
        </div>
      </div>

      {/* Controls */}
      {showAnswer && (
        <div className="flex items-center gap-4 mt-8">
          <Button
            variant="outline"
            size="lg"
            onClick={() => handleReview(false)}
            className="gap-2"
          >
            <ThumbsDown className="h-5 w-5 text-red-500" />
            Hard
          </Button>
          <Button
            size="lg"
            onClick={() => handleReview(true)}
            className="gap-2 bg-green-600 hover:bg-green-700"
          >
            <ThumbsUp className="h-5 w-5" />
            Easy
          </Button>
        </div>
      )}

      {/* Mastery level indicator */}
      <div className="mt-8 text-center">
        <p className="text-xs text-slate-400">
          Mastery Level: {currentWord.masteryLevel ?? 1} / 5
        </p>
        <div className="flex gap-1 justify-center mt-1">
          {[1, 2, 3, 4, 5].map((level) => (
            <div
              key={level}
              className={cn(
                "w-2 h-2 rounded-full",
                level <= (currentWord.masteryLevel ?? 1)
                  ? "bg-blue-500"
                  : "bg-slate-200 dark:bg-slate-700"
              )}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
