#!/usr/bin/env node
import { FIELDS, comboIndex, comboValues, roundState } from "./solver.js";

function fail(message) {
  console.error(`error: ${message}`);
  process.exit(1);
}

function parseAttempt(arg) {
  const match = arg.match(/^(.+)=([0-4])$/);
  if (!match) fail(`expected "v1.0 GET LTE AES=2", got "${arg}"`);
  const values = match[1].trim().split(/\s+/);
  if (values.length !== FIELDS.length) fail(`expected ${FIELDS.length} fields in "${arg}"`);
  values.forEach((value, f) => {
    if (!FIELDS[f].values.includes(value)) {
      fail(`unknown ${FIELDS[f].name} "${value}" (use ${FIELDS[f].values.join(", ")})`);
    }
  });
  return { guess: comboIndex(values), feedback: Number(match[2]) };
}

const DEFAULT_LIMIT = 6;
const args = process.argv.slice(2);
const flag = args.indexOf("--attempts-left");
let attemptsLeft;
if (flag !== -1) {
  const value = args.splice(flag, 2)[1];
  if (!/^\d+$/.test(value ?? "")) fail(`--attempts-left needs a whole number, got "${value}"`);
  attemptsLeft = Number(value);
}
const limit = attemptsLeft === undefined ? DEFAULT_LIMIT : attemptsLeft + args.length;
if (args.length > limit) fail(`at most ${limit} attempts allowed, got ${args.length}`);

const state = roundState(args.map(parseAttempt), limit);
if (state.candidates.length === 0) fail("no possible target matches these attempts");

console.log(
  JSON.stringify({
    solved: state.solved,
    triesLeft: state.triesLeft,
    candidates: state.candidates.length,
    move: state.move && comboValues(state.move.guess).join(" "),
    hits: state.move?.hits ?? null,
    possibleTargets: state.candidates.length <= 8 ? state.candidates.map((c) => comboValues(c).join(" ")) : undefined,
  }),
);
