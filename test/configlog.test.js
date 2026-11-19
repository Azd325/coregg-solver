import assert from "node:assert/strict";
import { test } from "node:test";
import { parseConfigLog } from "../public/configlog.js";

const parse = (text) => parseConfigLog(text, 8);
const problemLines = (text) => parse(text).problems.map(({ number }) => number);

test("the game's split lines read as one move", () => {
  assert.deepEqual(parse("Input: v1.0 GET LTE AES\nResult:\nMismatched 2"), {
    history: [{ guess: 0, feedback: 2 }],
    limit: null,
    problems: [],
  });
});

test("the one-line form and the split form mix in one log", () => {
  const { history, problems } = parse("Input: v1.0 GET LTE AES Result: Mismatched 2\nInput: v1.1 PUT Fiber RSA\nResult:\nMismatched 3");
  assert.deepEqual(history, [{ guess: 0, feedback: 2 }, { guess: 40, feedback: 3 }]);
  assert.deepEqual(problems, []);
});

test("field values match without regard to case, and blank lines and CRLF are fine", () => {
  const { history, problems } = parse("input: V2.0 post SAT des\r\n\r\nresult:\r\nMISMATCHED 4");
  assert.deepEqual(history, [{ guess: 80, feedback: 4 }]);
  assert.deepEqual(problems, []);
});

test("a slash Attempts line sets the total wherever it stands", () => {
  assert.equal(parse("Attempts: 2/4\nInput: v1.0 GET LTE AES Result: Mismatched 2").limit, 4);
  assert.equal(parse("Input: v1.0 GET LTE AES Result: Mismatched 2\nAttempts: 3/4").limit, 4);
});

test("a bare Attempts number sets the total only before any move", () => {
  assert.equal(parse("Attempts: 4\nInput: v1.0 GET LTE AES Result: Mismatched 2").limit, 4);
  assert.equal(parse("Input: v1.0 GET LTE AES Result: Mismatched 2\nAttempts: 4").limit, null);
});

test("only the first Attempts line counts", () => {
  assert.equal(parse("Attempts: 4\nAttempts: 6").limit, 4);
});

test("an Attempts total outside 1 to the maximum is a problem", () => {
  assert.deepEqual(problemLines("Attempts: 0"), [1]);
  assert.deepEqual(problemLines("Attempts: 9"), [1]);
  assert.deepEqual(problemLines("Attempts: 8"), []);
});

test("option lines are ignored, known or not", () => {
  const known = "→ v1.0 / v1.1 / v2.0\n→ GET / PUT / POST\n→ LTE / Fiber / Sat\n→ AES / RSA / DES";
  assert.deepEqual(parse(known), { history: [], limit: null, problems: [] });
  assert.deepEqual(parse("→ red / green / blue\nInput: v1.0 GET LTE AES Result: Mismatched 2"), {
    history: [{ guess: 0, feedback: 2 }],
    limit: null,
    problems: [],
  });
});

test("a line the parser cannot read is flagged with its line number", () => {
  assert.deepEqual(problemLines("hello\nInput: v1.0 GET LTE AES Result: Mismatched 2\nworld"), [1, 3]);
});

test("a move with the wrong field count or an unknown value is flagged", () => {
  assert.deepEqual(problemLines("Input: v1.0 GET LTE\nResult:\nMismatched 2"), [1]);
  assert.deepEqual(problemLines("Input: v1.0 GET LTE AES RSA Result: Mismatched 2"), [1]);
  assert.deepEqual(problemLines("Input: v3.0 GET LTE AES Result: Mismatched 2"), [1]);
  assert.deepEqual(problemLines("Input: GET v1.0 LTE AES Result: Mismatched 2"), [1]);
});

test("Mismatched above 4 is flagged", () => {
  assert.deepEqual(problemLines("Input: v1.0 GET LTE AES Result: Mismatched 5"), [1]);
});

test("an Input line with no Result and Mismatched is flagged, also at the end of the log", () => {
  assert.deepEqual(problemLines("Input: v1.0 GET LTE AES\nInput: v1.1 PUT Fiber RSA Result: Mismatched 3"), [1]);
  assert.deepEqual(problemLines("Input: v1.0 GET LTE AES Result: Mismatched 2\nInput: v1.1 PUT Fiber RSA"), [2]);
});

test("a move after a hit is flagged", () => {
  assert.deepEqual(problemLines("Input: v1.0 GET LTE AES Result: Mismatched 0\nInput: v1.0 GET LTE AES Result: Mismatched 0"), [2]);
});

test("a move that no target fits with the earlier moves is flagged", () => {
  assert.deepEqual(problemLines("Input: v1.0 GET LTE AES Result: Mismatched 1\nInput: v1.0 GET LTE AES Result: Mismatched 2"), [2]);
});

test("more moves than the attempts total is flagged at the first extra move", () => {
  assert.deepEqual(problemLines("Attempts: 1\nInput: v1.0 GET LTE AES Result: Mismatched 2\nInput: v1.1 PUT Fiber RSA Result: Mismatched 3"), [3]);
});

test("a slash Attempts total smaller than the moves played is flagged", () => {
  assert.deepEqual(problemLines("Input: v1.0 GET LTE AES Result: Mismatched 2\nInput: v1.1 PUT Fiber RSA Result: Mismatched 3\nAttempts: 2/1"), [2]);
});

test("empty text reads as nothing", () => {
  assert.deepEqual(parse(""), { history: [], limit: null, problems: [] });
});

test("one line over both the attempts and the maximum is flagged once", () => {
  const move = "Input: v1.0 GET LTE AES Result: Mismatched 2";
  const log = ["Attempts: 8/8", ...Array(9).fill(move)].join("\n");
  assert.equal(problemLines(log).filter((number) => number === 10).length, 1);
});

test("a move after the hit that is also over the attempts total is flagged once", () => {
  const move = "Input: v1.0 GET LTE AES Result: Mismatched 0";
  assert.deepEqual(problemLines(`Attempts: 1/1\n${move}\n${move}`), [3]);
});

const reasons = (text) => parse(text).problems.map(({ reason }) => reason);

test("a bad input value is named by its field", () => {
  assert.deepEqual(reasons("Input: v1.0 PUTT LTE AES Result: Mismatched 2"), ["PUTT is not a Method"]);
  assert.deepEqual(reasons("Input: v3.0 GET LTE AES Result: Mismatched 2"), ["v3.0 is not a Version"]);
  assert.deepEqual(reasons("Input: v1.0 GET LTE AED Result: Mismatched 2"), ["AED is not a Cipher"]);
});

test("an input with the wrong number of values names the four fields", () => {
  assert.deepEqual(reasons("Input: v1.0 GET LTE Result: Mismatched 2"), ["v1.0 GET LTE needs Version Method Channel Cipher"]);
  assert.deepEqual(reasons("Input: Result: Mismatched 2"), ["empty input needs Version Method Channel Cipher"]);
});
