import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { afterEach, describe, test } from "node:test";
import { db, intronQuotaWindowsTable } from "@workspace/db";
import { inArray } from "drizzle-orm";
import {
  reserveIntronQuota,
  type IntronQuotaPolicy,
} from "./intron-quota";

const touchedScopes = new Set<string>();

function isolatedPolicy(
  overrides: Partial<IntronQuotaPolicy> = {},
): IntronQuotaPolicy {
  const id = randomUUID();
  const policy = {
    globalLimit: 100,
    userLimit: 100,
    globalWindowMs: 60_000,
    userWindowMs: 60_000,
    globalScopeKey: `test-global:${id}`,
    userScopePrefix: `test-user:${id}:`,
    ...overrides,
  };
  touchedScopes.add(policy.globalScopeKey);
  return policy;
}

afterEach(async () => {
  if (!touchedScopes.size) return;
  const scopes = [...touchedScopes];
  touchedScopes.clear();
  await db
    .delete(intronQuotaWindowsTable)
    .where(inArray(intronQuotaWindowsTable.scopeKey, scopes));
});

describe("shared Intron quotas", () => {
  test("atomically enforces a per-user limit across concurrent requests", async () => {
    const policy = isolatedPolicy({ userLimit: 3 });
    const userId = randomUUID();
    const userScope = `${policy.userScopePrefix}${userId}`;
    touchedScopes.add(userScope);

    const results = await Promise.all(
      Array.from({ length: 6 }, () => reserveIntronQuota(userId, Date.now(), policy)),
    );

    assert.equal(results.filter((result) => result.allowed).length, 3);
    assert.equal(results.filter((result) => !result.allowed).length, 3);
  });

  test("shares the global limit across different users", async () => {
    const policy = isolatedPolicy({ globalLimit: 2 });
    const firstUser = randomUUID();
    const secondUser = randomUUID();
    touchedScopes.add(`${policy.userScopePrefix}${firstUser}`);
    touchedScopes.add(`${policy.userScopePrefix}${secondUser}`);

    assert.deepEqual(await reserveIntronQuota(firstUser, Date.now(), policy), { allowed: true });
    assert.deepEqual(await reserveIntronQuota(secondUser, Date.now(), policy), { allowed: true });
    const denied = await reserveIntronQuota(randomUUID(), Date.now(), policy);

    assert.equal(denied.allowed, false);
    if (!denied.allowed) assert.ok(denied.retryAfterSeconds > 0);
  });
});