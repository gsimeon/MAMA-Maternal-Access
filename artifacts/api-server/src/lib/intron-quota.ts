import { sql } from "drizzle-orm";
import { db, intronQuotaWindowsTable } from "@workspace/db";

export const INTRON_GLOBAL_LIMIT = 60;
export const INTRON_USER_LIMIT = 12;
export const INTRON_GLOBAL_WINDOW_MS = 60 * 60_000;
export const INTRON_USER_WINDOW_MS = 60_000;

export class IntronQuotaUnavailableError extends Error {}

export interface IntronQuotaPolicy {
  globalLimit: number;
  userLimit: number;
  globalWindowMs: number;
  userWindowMs: number;
  globalScopeKey: string;
  userScopePrefix: string;
}

const DEFAULT_POLICY: IntronQuotaPolicy = {
  globalLimit: INTRON_GLOBAL_LIMIT,
  userLimit: INTRON_USER_LIMIT,
  globalWindowMs: INTRON_GLOBAL_WINDOW_MS,
  userWindowMs: INTRON_USER_WINDOW_MS,
  globalScopeKey: "global",
  userScopePrefix: "user:",
};

class QuotaExceededError extends Error {
  constructor(readonly retryAt: number) {
    super("Intron quota exceeded.");
  }
}

function windowStart(now: number, durationMs: number): number {
  return Math.floor(now / durationMs) * durationMs;
}

function retryAfterSeconds(retryAt: number, now: number): number {
  return Math.max(1, Math.ceil((retryAt - now) / 1000));
}

export async function reserveIntronQuota(
  userId: string,
  now = Date.now(),
  policy: IntronQuotaPolicy = DEFAULT_POLICY,
): Promise<{ allowed: true } | { allowed: false; retryAfterSeconds: number }> {
  const globalStart = windowStart(now, policy.globalWindowMs);
  const userStart = windowStart(now, policy.userWindowMs);

  try {
    await db.transaction(async (tx) => {
      const [globalReservation] = await tx
        .insert(intronQuotaWindowsTable)
        .values({
          scopeKey: policy.globalScopeKey,
          windowStart: new Date(globalStart),
          count: 1,
        })
        .onConflictDoUpdate({
          target: [intronQuotaWindowsTable.scopeKey, intronQuotaWindowsTable.windowStart],
          set: { count: sql`${intronQuotaWindowsTable.count} + 1` },
          where: sql`${intronQuotaWindowsTable.count} < ${policy.globalLimit}`,
        })
        .returning({ count: intronQuotaWindowsTable.count });
      if (!globalReservation) {
        throw new QuotaExceededError(globalStart + policy.globalWindowMs);
      }

      const [userReservation] = await tx
        .insert(intronQuotaWindowsTable)
        .values({
          scopeKey: `${policy.userScopePrefix}${userId}`,
          windowStart: new Date(userStart),
          count: 1,
        })
        .onConflictDoUpdate({
          target: [intronQuotaWindowsTable.scopeKey, intronQuotaWindowsTable.windowStart],
          set: { count: sql`${intronQuotaWindowsTable.count} + 1` },
          where: sql`${intronQuotaWindowsTable.count} < ${policy.userLimit}`,
        })
        .returning({ count: intronQuotaWindowsTable.count });
      if (!userReservation) {
        throw new QuotaExceededError(userStart + policy.userWindowMs);
      }
    });
    return { allowed: true };
  } catch (error) {
    if (error instanceof QuotaExceededError) {
      return {
        allowed: false,
        retryAfterSeconds: retryAfterSeconds(error.retryAt, now),
      };
    }
    throw new IntronQuotaUnavailableError("Shared Intron quota storage is unavailable.");
  }
}