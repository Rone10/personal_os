"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";

interface ArabicFontContextType {
  fontSize: number;
  setFontSize: (size: number) => void;
  increaseFont: () => void;
  decreaseFont: () => void;
  resetFont: () => void;
}

const STORAGE_KEY = "arabic-font-size";
const DEFAULT_SIZE = 1.0;
const MIN_SIZE = 0.75;
const MAX_SIZE = 3.0;
const STEP = 0.1;

const ArabicFontContext = createContext<ArabicFontContextType | undefined>(
  undefined
);

interface ArabicFontProviderProps {
  children: ReactNode;
}

export function ArabicFontProvider({ children }: ArabicFontProviderProps) {
  const [fontSize, setFontSizeState] = useState(DEFAULT_SIZE);
  const [isHydrated, setIsHydrated] = useState(false);

  // Read from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = parseFloat(stored);
      if (!isNaN(parsed) && parsed >= MIN_SIZE && parsed <= MAX_SIZE) {
        setFontSizeState(parsed);
      }
    }
    setIsHydrated(true);
  }, []);

  // Persist to localStorage when fontSize changes
  useEffect(() => {
    if (isHydrated) {
      localStorage.setItem(STORAGE_KEY, fontSize.toString());
    }
  }, [fontSize, isHydrated]);

  const setFontSize = useCallback((size: number) => {
    const clamped = Math.min(MAX_SIZE, Math.max(MIN_SIZE, size));
    setFontSizeState(Math.round(clamped * 100) / 100);
  }, []);

  const increaseFont = useCallback(() => {
    setFontSizeState((prev) => {
      const next = prev + STEP;
      return Math.min(MAX_SIZE, Math.round(next * 100) / 100);
    });
  }, []);

  const decreaseFont = useCallback(() => {
    setFontSizeState((prev) => {
      const next = prev - STEP;
      return Math.max(MIN_SIZE, Math.round(next * 100) / 100);
    });
  }, []);

  const resetFont = useCallback(() => {
    setFontSizeState(DEFAULT_SIZE);
  }, []);

  return (
    <ArabicFontContext.Provider
      value={{
        fontSize,
        setFontSize,
        increaseFont,
        decreaseFont,
        resetFont,
      }}
    >
      {children}
    </ArabicFontContext.Provider>
  );
}

export function useArabicFont() {
  const context = useContext(ArabicFontContext);
  // Return default values if context isn't available (e.g., during SSR or outside provider)
  if (context === undefined) {
    return {
      fontSize: DEFAULT_SIZE,
      setFontSize: () => {},
      increaseFont: () => {},
      decreaseFont: () => {},
      resetFont: () => {},
    };
  }
  return context;
}

// Export constants for use in other components
export const ARABIC_FONT_CONFIG = {
  minSize: MIN_SIZE,
  maxSize: MAX_SIZE,
  step: STEP,
  defaultSize: DEFAULT_SIZE,
};
