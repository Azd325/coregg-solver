import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { bestMove, solvable } from "../public/solver.js";

const cli = fileURLToPath(new URL("../skills/coregg-solver/scripts/next-move.mjs", import.meta.url));
const run = (...args) => spawnSync("node", [cli, ...args], { encoding: "utf8" });

test("skill solver.js is identical to public/solver.js", () => {
  const skillCopy = readFileSync(new URL("../skills/coregg-solver/scripts/solver.js", import.meta.url));
  const original = readFileSync(new URL("../public/solver.js", import.meta.url));
  assert.ok(skillCopy.equals(original));
});

test("solver functions return at once when no tries are left", () => {
  assert.equal(solvable([0, 1, 2], -1), 0);
  assert.equal(bestMove([0, 1, 2], -1), null);
});

test("cli rejects a history longer than the attempt limit", () => {
  const attempts = ["v1.0 GET LTE AES=2", "v1.1 PUT Fiber RSA=3", "v2.0 POST Sat DES=4", "v1.0 PUT Fiber DES=3", "v1.0 GET LTE AES=2"];
  const result = run(...attempts);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /at most 4 attempts/);
  assert.doesNotMatch(result.stderr, /RangeError/);
});

test("cli accepts more entries than the default limit with --attempts-left", () => {
  const attempts = ["v1.0 GET LTE AES=2", "v1.0 GET Fiber RSA=2", "v1.0 PUT LTE RSA=3", "v1.0 GET Sat DES=3", "v1.0 POST Fiber AES=0"];
  const output = JSON.parse(execFileSync("node", [cli, "--attempts-left", "1", ...attempts], { encoding: "utf8" }));
  assert.equal(output.solved, true);
  assert.equal(output.triesLeft, 1);
});

test("cli uses --attempts-left to pick a move that can still win", () => {
  const output = JSON.parse(execFileSync("node", [cli, "v1.0 GET LTE AES=1", "--attempts-left", "1"], { encoding: "utf8" }));
  assert.equal(output.triesLeft, 1);
  assert.ok(output.possibleTargets.includes(output.move));
});

test("cli rejects a non-numeric --attempts-left", () => {
  const result = run("--attempts-left", "many");
  assert.equal(result.status, 1);
  assert.match(result.stderr, /--attempts-left needs a whole number/);
});

test("cli rejects an unknown field value", () => {
  const result = run("v1.1 GET LTE XXX=2");
  assert.equal(result.status, 1);
  assert.match(result.stderr, /unknown Cipher "XXX"/);
});

test("cli rejects attempts that leave no possible target", () => {
  const result = run("v1.0 GET LTE AES=0", "v1.0 GET LTE AES=2");
  assert.equal(result.status, 1);
  assert.match(result.stderr, /no possible target/);
});

test("cli reports candidates and tries left after one attempt", () => {
  const output = JSON.parse(execFileSync("node", [cli, "v1.0 GET LTE AES=2"], { encoding: "utf8" }));
  assert.equal(output.candidates, 24);
  assert.equal(output.triesLeft, 3);
  assert.equal(output.solved, false);
});

test("cli prints the opening move without arguments", () => {
  const output = JSON.parse(execFileSync("node", [cli], { encoding: "utf8" }));
  assert.equal(output.move, "v1.0 GET LTE AES");
  assert.equal(output.triesLeft, 4);
});

test("installed skill folder runs under a commonjs project", () => {
  const project = mkdtempSync(join(tmpdir(), "coregg-skill-"));
  try {
    writeFileSync(join(project, "package.json"), '{"type":"commonjs"}');
    const installed = join(project, ".claude", "skills", "coregg-solver");
    cpSync(fileURLToPath(new URL("../skills/coregg-solver", import.meta.url)), installed, { recursive: true });
    const result = spawnSync("node", [join(installed, "scripts", "next-move.mjs")], { encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(JSON.parse(result.stdout).move, "v1.0 GET LTE AES");
  } finally {
    rmSync(project, { recursive: true, force: true });
  }
});
