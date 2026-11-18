export const FIELDS = [
  { name: "Version", values: ["v1.0", "v1.1", "v2.0"] },
  { name: "Method", values: ["GET", "PUT", "POST"] },
  { name: "Channel", values: ["LTE", "Fiber", "Sat"] },
  { name: "Cipher", values: ["AES", "RSA", "DES"] },
];

export const MAX_TRIES = 4;

export const COMBOS = FIELDS.reduce(
  (combos, field) => combos.flatMap((combo) => field.values.map((_, v) => [...combo, v])),
  [[]],
);

const N = COMBOS.length;
const ALL = COMBOS.map((_, i) => i);
const MAX_FEEDBACK = FIELDS.length;

export const MISMATCH = new Uint8Array(N * N);
for (let a = 0; a < N; a++) {
  for (let b = 0; b < N; b++) {
    MISMATCH[a * N + b] = COMBOS[a].filter((v, f) => v !== COMBOS[b][f]).length;
  }
}

export function mismatch(a, b) {
  return MISMATCH[a * N + b];
}

export function comboIndex(values) {
  return values.reduce((index, value, f) => index * 3 + FIELDS[f].values.indexOf(value), 0);
}

export function comboValues(index) {
  return COMBOS[index].map((v, f) => FIELDS[f].values[v]);
}

export function filterCandidates(candidates, guess, feedback) {
  return candidates.filter((c) => mismatch(guess, c) === feedback);
}

export function candidatesFor(history) {
  return history.reduce((candidates, { guess, feedback }) => filterCandidates(candidates, guess, feedback), ALL);
}

export function partition(candidates, guess) {
  const groups = Array.from({ length: MAX_FEEDBACK + 1 }, () => []);
  for (const c of candidates) groups[mismatch(guess, c)].push(c);
  return groups;
}

const memo = new Map();

function guessScore(candidates, guess, tries) {
  const groups = partition(candidates, guess);
  let hits = groups[0].length;
  for (let feedback = 1; feedback <= MAX_FEEDBACK; feedback++) {
    if (groups[feedback].length > 0) hits += solvable(groups[feedback], tries - 1);
  }
  return hits;
}

export function solvable(candidates, tries) {
  if (tries === 0 || candidates.length === 0) return 0;
  if (tries === 1 || candidates.length === 1) return 1;
  const key = `${tries}:${candidates.join(",")}`;
  let best = memo.get(key);
  if (best !== undefined) return best;
  best = 0;
  for (let guess = 0; guess < N && best < candidates.length; guess++) {
    best = Math.max(best, guessScore(candidates, guess, tries));
  }
  memo.set(key, best);
  return best;
}

export function bestMove(candidates, tries) {
  if (tries === 0 || candidates.length === 0) return null;
  if (tries === 1 || candidates.length === 1) return { guess: candidates[0], hits: 1 };
  const possible = new Set(candidates);
  let best = null;
  for (let guess = 0; guess < N; guess++) {
    const hits = guessScore(candidates, guess, tries);
    if (!best || hits > best.hits || (hits === best.hits && possible.has(guess) && !possible.has(best.guess))) {
      best = { guess, hits };
    }
  }
  return best;
}

export const OPENING_MOVE = { guess: 0, hits: 55 };

export function recommend(history) {
  if (history.length === 0) return OPENING_MOVE;
  return bestMove(candidatesFor(history), MAX_TRIES - history.length);
}

export function roundState(history) {
  const candidates = candidatesFor(history);
  const triesLeft = MAX_TRIES - history.length;
  const solved = history.at(-1)?.feedback === 0;
  const move = solved ? null : recommend(history);
  return { candidates, triesLeft, solved, move };
}

export function play(history, guess, feedback) {
  const next = [...history, { guess, feedback }];
  if (candidatesFor(next).length === 0) return { history, conflict: true };
  return { history: next, conflict: false };
}
