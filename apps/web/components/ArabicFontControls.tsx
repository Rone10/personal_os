"use client";

import { Minus, Plus, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useArabicFont,
  ARABIC_FONT_CONFIG,
} from "@/lib/contexts/ArabicFontContext";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ArabicFontControlsProps {
  showPercentage?: boolean;
  compact?: boolean;
}

export function ArabicFontControls({
  showPercentage = true,
  compact = false,
}: ArabicFontControlsProps) {
  const { fontSize, increaseFont, decreaseFont, resetFont } = useArabicFont();

  const percentage = Math.round(fontSize * 100);
  const canDecrease = fontSize > ARABIC_FONT_CONFIG.minSize;
  const canIncrease = fontSize < ARABIC_FONT_CONFIG.maxSize;
  const isDefault = fontSize === ARABIC_FONT_CONFIG.defaultSize;

  if (compact) {
    return (
      <TooltipProvider>
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={decreaseFont}
                disabled={!canDecrease}
              >
                <Minus className="h-3 w-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Decrease Arabic font size</TooltipContent>
          </Tooltip>

          {showPercentage && (
            <span className="text-xs text-slate-500 w-8 text-center tabular-nums">
              {percentage}%
            </span>
          )}

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={increaseFont}
                disabled={!canIncrease}
              >
                <Plus className="h-3 w-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Increase Arabic font size</TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <div className="flex items-center gap-2 p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
        <span className="text-xs text-slate-500 font-medium">Arabic Size</span>

        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={decreaseFont}
                disabled={!canDecrease}
              >
                <Minus className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              Decrease font size (min {ARABIC_FONT_CONFIG.minSize * 100}%)
            </TooltipContent>
          </Tooltip>

          {showPercentage && (
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300 w-12 text-center tabular-nums">
              {percentage}%
            </span>
          )}

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={increaseFont}
                disabled={!canIncrease}
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              Increase font size (max {ARABIC_FONT_CONFIG.maxSize * 100}%)
            </TooltipContent>
          </Tooltip>

          {!isDefault && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 ml-1"
                  onClick={resetFont}
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Reset to default size</TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
