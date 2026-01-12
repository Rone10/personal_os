"use client";

import { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { useArabicFont } from "@/lib/contexts/ArabicFontContext";

export type ArabicTextVariant = "quran" | "hadith" | "word" | "default";
export type ArabicTextSize = "sm" | "md" | "lg" | "xl" | "2xl" | "3xl";

interface ArabicTextProps extends HTMLAttributes<HTMLElement> {
  variant?: ArabicTextVariant;
  size?: ArabicTextSize;
  as?: "span" | "p" | "div" | "h1" | "h2" | "h3";
}

const baseFontSizes: Record<ArabicTextSize, number> = {
  sm: 0.875,
  md: 1,
  lg: 1.125,
  xl: 1.25,
  "2xl": 1.5,
  "3xl": 1.875,
};

export function ArabicText({
  children,
  variant = "default",
  size = "lg",
  as: Component = "span",
  className,
  style,
  ...props
}: ArabicTextProps) {
  const { fontSize: fontScale } = useArabicFont();

  const fontClass = variant === "quran" ? "font-quran" : "font-arabic";
  const baseFontSize = baseFontSizes[size];
  const scaledFontSize = baseFontSize * fontScale;

  return (
    <Component
      dir="rtl"
      className={cn(fontClass, className)}
      style={{
        fontSize: `${scaledFontSize}rem`,
        ...style,
      }}
      {...props}
    >
      {children}
    </Component>
  );
}

// Convenience wrapper that doesn't use context (for places outside provider)
interface StaticArabicTextProps extends HTMLAttributes<HTMLElement> {
  variant?: ArabicTextVariant;
  as?: "span" | "p" | "div" | "h1" | "h2" | "h3";
}

export function StaticArabicText({
  children,
  variant = "default",
  as: Component = "span",
  className,
  ...props
}: StaticArabicTextProps) {
  const fontClass = variant === "quran" ? "font-quran" : "font-arabic";

  return (
    <Component dir="rtl" className={cn(fontClass, className)} {...props}>
      {children}
    </Component>
  );
}
