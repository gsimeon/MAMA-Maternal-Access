import { integer, pgTable, timestamp, uniqueIndex, varchar } from "drizzle-orm/pg-core";

export const intronQuotaWindowsTable = pgTable(
  "intron_quota_windows",
  {
    scopeKey: varchar("scope_key").notNull(),
    windowStart: timestamp("window_start", { withTimezone: true }).notNull(),
    count: integer("count").notNull().default(0),
  },
  (table) => [
    uniqueIndex("intron_quota_windows_scope_start_idx").on(
      table.scopeKey,
      table.windowStart,
    ),
  ],
);

export type IntronQuotaWindow = typeof intronQuotaWindowsTable.$inferSelect;