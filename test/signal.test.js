import assert from "node:assert/strict";
import { test } from "node:test";
import { decodeSignal } from "../public/signal.js";

const read = (text) => {
  const { status, readings } = decodeSignal(text);
  return [status, readings.map(({ encoding, code }) => `${encoding} ${code}`)];
};

test("each Morse digit group reads as its digit", () => {
  const groups = ["LLLLL", "SLLLL", "SSLLL", "SSSLL", "SSSSL", "SSSSS", "LSSSS", "LLSSS", "LLLSS", "LLLLS"];
  groups.forEach((group, digit) => assert.deepEqual(read(group), ["single", [`Morse ${digit}`]]));
});

test("each binary digit group reads as its digit", () => {
  const groups = ["SSSS", "SSSL", "SSLS", "SSLL", "SLSS", "SLSL", "SLLS", "SLLL", "LSSS", "LSSL"];
  groups.forEach((group, digit) => assert.deepEqual(read(group), ["single", [`Binary ${digit}`]]));
});

test("several groups join into one code", () => {
  assert.deepEqual(read("LLLLLSLLLLSSLLL"), ["single", ["Morse 012"]]);
  assert.deepEqual(read("SSSLSLLSLSSS"), ["single", ["Binary 168"]]);
});

test("a group outside the map gives no reading", () => {
  assert.deepEqual(read("LLSL"), ["none", []]);
  assert.deepEqual(read("LLLLLSSSSSSLSLL"), ["none", []]);
});

test("a length that no group size divides gives no reading", () => {
  assert.deepEqual(read("SSSSSS"), ["none", []]);
  assert.deepEqual(read("SSS"), ["none", []]);
});

test("a leftover tail voids the reading instead of being dropped", () => {
  assert.deepEqual(read("SSSSSSSSS"), ["none", []]);
  assert.deepEqual(read("SSSLS"), ["none", []]);
});

test("40 pulses that fit both maps read as binary", () => {
  assert.deepEqual(read("S".repeat(40)), ["binary-rule", ["Binary 0000000000"]]);
});

test("another double match shows both readings and cannot decide", () => {
  assert.deepEqual(read("S".repeat(20)), ["undecided", ["Morse 5555", "Binary 00000"]]);
  assert.deepEqual(read("S".repeat(60)), ["undecided", ["Morse 555555555555", "Binary 000000000000000"]]);
});

test("40 pulses that fit only Morse stay Morse", () => {
  assert.deepEqual(read("LLLLL".repeat(8)), ["single", ["Morse 00000000"]]);
});

test("spaces and lower case are ignored", () => {
  assert.deepEqual(read(" ss sl\nLS "), ["none", []]);
  assert.deepEqual(read("ss sl"), ["single", ["Binary 1"]]);
});

test("a character other than S and L makes the input invalid", () => {
  assert.deepEqual(decodeSignal("SS?L"), { status: "invalid", pulses: "SS?L", invalid: ["?"], readings: [] });
  assert.deepEqual(decodeSignal("S1S1").invalid, ["1"]);
});

test("empty input is empty", () => {
  assert.deepEqual(decodeSignal(" \n "), { status: "empty", pulses: "", readings: [] });
});
