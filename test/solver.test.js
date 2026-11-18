import assert from "node:assert/strict";
import { test } from "node:test";
import {
  COMBOS,
  OPENING_MOVE,
  candidatesFor,
  bestMove,
  comboIndex,
  comboValues,
  mismatch,
  play,
  roundState,
  solvable,
} from "../public/solver.js";

const move = (version, method, channel, cipher) => comboIndex([version, method, channel, cipher]);
const labels = (candidates) => candidates.map((c) => comboValues(c).join(" "));

test("mismatch matrix counts differing positions", () => {
  assert.equal(COMBOS.length, 81);
  assert.equal(mismatch(move("v1.0", "GET", "LTE", "AES"), move("v1.0", "GET", "LTE", "AES")), 0);
  assert.equal(mismatch(move("v1.0", "GET", "LTE", "AES"), move("v1.1", "PUT", "LTE", "AES")), 2);
  assert.equal(mismatch(move("v1.0", "GET", "LTE", "AES"), move("v2.0", "POST", "Sat", "DES")), 4);
  for (let a = 0; a < 81; a++) {
    const counts = [0, 0, 0, 0, 0];
    for (let b = 0; b < 81; b++) {
      assert.equal(mismatch(a, b), mismatch(b, a));
      counts[mismatch(a, b)]++;
    }
    assert.deepEqual(counts, [1, 8, 24, 32, 16]);
  }
});

test("new round has 81 candidates and 4 tries", () => {
  const state = roundState([], 4);
  assert.equal(state.candidates.length, 81);
  assert.equal(state.triesLeft, 4);
  assert.equal(state.solved, false);
});

test("v1.0 GET LTE AES -> 2 leaves 24 candidates and 3 tries", () => {
  const { history } = play([], move("v1.0", "GET", "LTE", "AES"), 2);
  const state = roundState(history, 4);
  assert.equal(state.candidates.length, 24);
  assert.equal(state.triesLeft, 3);
});

test("then v1.1 PUT LTE AES -> 3 leaves 8 candidates and 2 tries", () => {
  let { history } = play([], move("v1.0", "GET", "LTE", "AES"), 2);
  ({ history } = play(history, move("v1.1", "PUT", "LTE", "AES"), 3));
  const state = roundState(history, 4);
  assert.equal(state.candidates.length, 8);
  assert.equal(state.triesLeft, 2);
});

test("alternatively v1.0 GET Fiber RSA -> 4 fixes LTE and AES", () => {
  let { history } = play([], move("v1.0", "GET", "LTE", "AES"), 2);
  ({ history } = play(history, move("v1.0", "GET", "Fiber", "RSA"), 4));
  assert.deepEqual(labels(roundState(history, 4).candidates), [
    "v1.1 PUT LTE AES",
    "v1.1 POST LTE AES",
    "v2.0 PUT LTE AES",
    "v2.0 POST LTE AES",
  ]);
});

test("undo restores the previous candidates and tries exactly", () => {
  const first = play([], move("v1.0", "GET", "LTE", "AES"), 2).history;
  const second = play(first, move("v1.1", "PUT", "LTE", "AES"), 3).history;
  assert.deepEqual(roundState(second.slice(0, -1), 4), roundState(first, 4));
  assert.deepEqual(roundState(first.slice(0, -1), 4), roundState([], 4));
});

test("an entry that leaves no candidates is a conflict and keeps the state", () => {
  const first = play([], move("v1.0", "GET", "LTE", "AES"), 2).history;
  const result = play(first, move("v1.0", "GET", "LTE", "AES"), 3);
  assert.equal(result.conflict, true);
  assert.equal(result.history, first);
});

test("feedback 0 solves the round", () => {
  const { history } = play([], move("v2.0", "PUT", "Sat", "RSA"), 0);
  const state = roundState(history, 4);
  assert.equal(state.solved, true);
  assert.deepEqual(labels(state.candidates), ["v2.0 PUT Sat RSA"]);
  assert.equal(state.move, null);
});

test("search counts solvable targets per remaining tries", () => {
  const candidates = [
    move("v1.1", "PUT", "LTE", "AES"),
    move("v1.1", "POST", "LTE", "AES"),
    move("v2.0", "PUT", "LTE", "AES"),
    move("v2.0", "POST", "LTE", "AES"),
  ];
  assert.equal(solvable(candidates, 1), 1);
  assert.equal(solvable(candidates, 2), 3);
  assert.equal(solvable(candidates, 3), 4);
  assert.deepEqual(bestMove(candidates, 2), { guess: move("v1.1", "PUT", "LTE", "AES"), hits: 3 });
});

test("ties prefer a possible candidate over an earlier probe", () => {
  const candidates = [move("v1.0", "PUT", "LTE", "AES"), move("v1.1", "PUT", "LTE", "AES"), move("v2.0", "PUT", "LTE", "AES")];
  assert.deepEqual(bestMove(candidates, 2), { guess: move("v1.0", "PUT", "LTE", "AES"), hits: 2 });
});

test("a probe outside the candidates can beat every candidate", () => {
  const { history } = play([], move("v1.0", "GET", "LTE", "AES"), 1);
  const state = roundState(history, 4);
  assert.equal(state.candidates.length, 8);
  assert.deepEqual(state.move, { guess: move("v1.0", "PUT", "Fiber", "RSA"), hits: 8 });
  assert.equal(state.candidates.includes(state.move.guess), false);
});

test("hard-coded opening move matches a fresh search", () => {
  const all = COMBOS.map((_, i) => i);
  assert.deepEqual(bestMove(all, 4), OPENING_MOVE);
  assert.deepEqual(comboValues(OPENING_MOVE.guess), ["v1.0", "GET", "LTE", "AES"]);
});

function guessCounts(limit) {
  const counts = Array(limit + 1).fill(0);
  COMBOS.forEach((_, target) => {
    let history = [];
    for (let attempt = 1; attempt <= limit; attempt++) {
      const { move, solved } = roundState(history, limit);
      if (solved || !move) return;
      history = [...history, { guess: move.guess, feedback: mismatch(move.guess, target) }];
      if (history.at(-1).feedback === 0) {
        counts[attempt]++;
        return;
      }
    }
  });
  return counts;
}

const targetsSolved = (limit) => guessCounts(limit).reduce((sum, n) => sum + n, 0);

test("the recommended moves solve 55 of 81 targets with 4 attempts and all 81 with 5 or 6", () => {
  assert.equal(targetsSolved(4), 55);
  assert.equal(targetsSolved(5), 81);
  assert.equal(targetsSolved(6), 81);
});

test("spare attempts do not slow the solve: no target needs a sixth guess", () => {
  const expected = [0, 1, 3, 11, 32, 34];
  for (const limit of [5, 6, 8]) {
    assert.deepEqual(guessCounts(limit).slice(0, 6), expected);
    assert.equal(guessCounts(limit).slice(6).reduce((sum, n) => sum + n, 0), 0);
  }
});

test("tries left follow the limit", () => {
  const { history } = play([], move("v1.0", "GET", "LTE", "AES"), 2);
  assert.equal(roundState(history, 6).triesLeft, 5);
  assert.equal(roundState(history, 2).triesLeft, 1);
});

test("with one attempt left the move is a possible target, not a probe", () => {
  const { history } = play([], move("v1.0", "GET", "LTE", "AES"), 1);
  const state = roundState(history, 2);
  assert.equal(state.triesLeft, 1);
  assert.ok(candidatesFor(history).includes(state.move.guess));
});

test("the opening move for a limit other than 4 is searched, not precomputed", () => {
  assert.deepEqual(roundState([], 6).move, { guess: 0, hits: 81 });
});
