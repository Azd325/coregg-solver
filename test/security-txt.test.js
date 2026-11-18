import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const text = readFileSync(new URL("../public/.well-known/security.txt", import.meta.url), "utf8");
const field = (name) => text.match(new RegExp(`^${name}: (.+)$`, "m"))?.[1];

test("security.txt has a Contact", () => {
  assert.match(field("Contact"), /^https:\/\//);
});

test("security.txt Expires is a future ISO 8601 UTC date", () => {
  const expires = field("Expires");
  assert.match(expires, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/);
  assert.ok(Date.parse(expires) > Date.now());
});
