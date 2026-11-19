import assert from "node:assert/strict";
import { test } from "node:test";
import { checkLine, checkLog } from "../public/logcheck.js";

const faults = (line) => checkLine(line).map(({ code, reason }) => [code, reason]);

test("a line with every part valid has no faults", () => {
  assert.deepEqual(faults("[14:03:22] SCAN /sector=12 /status=OK"), []);
  assert.deepEqual(faults("[00:00:00] TEMP-SYNC /sector=1 /status=WARN"), []);
  assert.deepEqual(faults("[23:59:59] ROUTE-CHECK /sector=256 /status=ERROR"), []);
});

test("each time component out of range is named", () => {
  assert.deepEqual(faults("[25:03:22] SCAN /sector=12 /status=OK"), [["TIME", "hour 25"]]);
  assert.deepEqual(faults("[14:61:22] SCAN /sector=12 /status=OK"), [["TIME", "minute 61"]]);
  assert.deepEqual(faults("[14:03:70] SCAN /sector=12 /status=OK"), [["TIME", "second 70"]]);
  assert.deepEqual(faults("[24:60:60] SCAN /sector=12 /status=OK"), [["TIME", "hour 24, minute 60, second 60"]]);
});

test("a malformed or missing time is one time fault", () => {
  assert.deepEqual(faults("[1:03:22] SCAN /sector=12 /status=OK"), [["TIME", "[1:03:22] is not [HH:MM:SS]"]]);
  assert.deepEqual(faults("[14:03] SCAN /sector=12 /status=OK"), [["TIME", "[14:03] is not [HH:MM:SS]"]]);
  assert.deepEqual(faults("SCAN /sector=12 /status=OK"), [["TIME", "no [HH:MM:SS]"]]);
});

test("a missing space after the closing bracket is a time fault", () => {
  assert.deepEqual(faults("[14:03:22]SCAN /sector=12 /status=OK"), [["TIME", "no space after ]"]]);
  assert.deepEqual(faults("[25:03:22]SCAN /sector=12 /status=OK"), [["TIME", "hour 25, no space after ]"]]);
});

test("the type must be in the set, in upper case", () => {
  assert.deepEqual(faults("[14:03:22] SCANX /sector=12 /status=OK"), [["TYPE", "SCANX"]]);
  assert.deepEqual(faults("[14:03:22] scan /sector=12 /status=OK"), [["TYPE", "scan"]]);
  assert.deepEqual(faults("[14:03:22] Auth /sector=12 /status=OK"), [["TYPE", "Auth"]]);
  assert.deepEqual(faults("[14:03:22] /sector=12 /status=OK"), [["TYPE", "no type"]]);
});

test("the sector must be a whole number from 1 to 256", () => {
  for (const sector of ["0", "257", "abc", "1.5", "-3", ""]) {
    assert.deepEqual(faults(`[14:03:22] PING /sector=${sector} /status=OK`), [["SECTOR_BAD", `sector ${sector || "empty"}`]]);
  }
});

test("the status must be OK, WARN or ERROR in upper case", () => {
  assert.deepEqual(faults("[14:03:22] PING /sector=5 /status=ok"), [["STATUS_BAD", "status ok"]]);
  assert.deepEqual(faults("[14:03:22] PING /sector=5 /status=FINE"), [["STATUS_BAD", "status FINE"]]);
  assert.deepEqual(faults("[14:03:22] PING /sector=5 /status="), [["STATUS_BAD", "status empty"]]);
});

test("missing parameters are named, in any order", () => {
  assert.deepEqual(faults("[14:03:22] SYNC"), [["MISSING_SECTOR", "no /sector"], ["MISSING_STATUS", "no /status"]]);
  assert.deepEqual(faults("[14:03:22] SYNC /status=OK"), [["MISSING_SECTOR", "no /sector"]]);
  assert.deepEqual(faults("[14:03:22] SYNC /status=OK /sector=9"), []);
});

test("every fault carries the label of the game's error button", () => {
  const line = "[99:03:22] NOPE /sector=0 /status=BAD";
  assert.deepEqual(
    checkLine(line).map((fault) => fault.label),
    ["Time format is incorrect", "Event type is incorrect", "/sector parameter is incorrect", "/status parameter is incorrect"],
  );
});

test("a bare line breaks the time, type, sector and status rules once each", () => {
  assert.equal(faults("SYNCX").length, 4);
  assert.equal(faults("").length, 4);
});

const LOG = [
  "[14:03:22] SCAN /sector=12 /status=OK",
  "[25:03:22] SCAN /sector=12 /status=OK",
  "",
  "[14:61:70] SCANX /sector=999 /status=OK",
  "[14:03:22] SCAN /sector=12",
  "[14:03:22] PING /sector=0 /status=BAD",
].join("\n");

test("the two lines with the most faults are the pick, and every faulty line stays listed", () => {
  const lines = checkLog(LOG);
  assert.deepEqual(lines.map((line) => line.number), [1, 2, 4, 5, 6]);
  assert.deepEqual(lines.map((line) => line.faults.length), [0, 1, 3, 1, 2]);
  assert.deepEqual(lines.map((line) => line.pick), [false, false, true, false, true]);
});

test("a tie for second place marks the earlier line", () => {
  const lines = checkLog(["[14:03:22] SYNC", "[25:03:22] SCAN /sector=1 /status=OK", "[14:03:22] SCAN /sector=0 /status=OK", "[14:03:22] SCAN /sector=1 /status=X"].join("\n"));
  assert.deepEqual(lines.map((line) => line.faults.length), [2, 1, 1, 1]);
  assert.deepEqual(lines.map((line) => line.pick), [true, true, false, false]);
});

test("a log with one faulty line marks only that line, and a clean log marks none", () => {
  const one = checkLog("[14:03:22] SCAN /sector=1 /status=OK\n[14:03:22] SCAN /sector=0 /status=OK");
  assert.deepEqual(one.map((line) => line.pick), [false, true]);
  const clean = checkLog("[14:03:22] SCAN /sector=1 /status=OK\r\n[14:03:23] PING /sector=2 /status=WARN");
  assert.deepEqual(clean.map((line) => line.pick), [false, false]);
  assert.deepEqual(checkLog("  \n\n"), []);
});
