/**
 * Shared helpers for Study Center backend functions.
 */

import { QueryCtx, MutationCtx } from "../_generated/server";
import { Id } from "../_generated/dataModel";

/**
 * Get userId from auth context, throw if not authenticated.
 * Use this for mutations that require auth.
 */
export async function requireAuth(ctx: QueryCtx | MutationCtx): Promise<string> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Unauthorized");
  }
  return identity.subject;
}

/**
 * Get userId from auth context, return null if not authenticated.
 * Use this for queries that can handle unauthenticated state.
 */
export async function getAuthOrNull(ctx: QueryCtx | MutationCtx): Promise<string | null> {
  const identity = await ctx.auth.getUserIdentity();
  return identity?.subject ?? null;
}

/**
 * Verify ownership of a document.
 * Throws if the document doesn't exist or belongs to a different user.
 */
export function verifyOwnership<T extends { userId: string }>(
  doc: T | null,
  userId: string,
  entityName: string = "Document"
): asserts doc is T {
  if (!doc) {
    throw new Error(`${entityName} not found`);
  }
  if (doc.userId !== userId) {
    throw new Error(`Unauthorized access to ${entityName}`);
  }
}

/**
 * Compute next review date based on mastery level.
 * Uses spaced repetition intervals.
 */
export function computeNextReview(masteryLevel: number): number {
  const now = Date.now();
  const intervals: Record<number, number> = {
    1: 1 * 24 * 60 * 60 * 1000, // 1 day
    2: 3 * 24 * 60 * 60 * 1000, // 3 days
    3: 7 * 24 * 60 * 60 * 1000, // 7 days
    4: 14 * 24 * 60 * 60 * 1000, // 14 days
    5: 30 * 24 * 60 * 60 * 1000, // 30 days
  };
  const interval = intervals[masteryLevel] ?? intervals[1];
  return now + interval;
}

/**
 * Get current timestamp.
 */
export function now(): number {
  return Date.now();
}
