import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { safeReturnPath } from "./origins";

describe("authentication return paths", () => {
  const origin = "https://mama.example";

  test("preserves a same-origin application path", () => {
    assert.equal(
      safeReturnPath("/conversation?id=abc#voice", origin),
      "/conversation?id=abc#voice",
    );
  });

  test("rejects scheme-relative and backslash external redirects", () => {
    assert.equal(safeReturnPath("//attacker.example", origin), "/");
    assert.equal(safeReturnPath("/\\attacker.example", origin), "/");
    assert.equal(safeReturnPath("https://attacker.example", origin), "/");
  });
});