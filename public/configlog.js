import { COMBOS, FIELDS, candidatesFor } from "./solver.js";

const INPUT_START = /^Input:/i;
const INPUT_CONTINUATION = /^(Result:|Mismatched\b)/i;
const ENTRY = /^Input:\s*(.*?)\s*Result:\s*Mismatched\s*(\d+)$/i;
const OPTIONS = /^→\s*(.+)$/;
const ATTEMPTS = /^Attempts:\s*(\d+)(?:\s*\/\s*(\d+))?\s*$/i;

function comboFrom(text) {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length !== FIELDS.length) return { reason: `${text || "empty input"} needs ${FIELDS.map(({ name }) => name).join(" ")}` };
  const values = words.map((word, f) => FIELDS[f].values.findIndex((value) => value.toLowerCase() === word.toLowerCase()));
  const bad = values.indexOf(-1);
  if (bad !== -1) return { reason: `${words[bad]} is not a ${FIELDS[bad].name}` };
  return { index: COMBOS.findIndex((combo) => combo.every((v, f) => v === values[f])) };
}

export function parseConfigLog(text, maxLimit) {
  const entries = [];
  const problems = [];
  let limit = null;
  let pending = null;

  const problem = (number, line, reason) => problems.push({ number, text: line, reason });

  const finish = () => {
    if (!pending) return;
    const { number, parts } = pending;
    pending = null;
    const joined = parts.join(" ");
    const match = joined.match(ENTRY);
    if (!match) return problem(number, joined, "an Input line needs a Result and a Mismatched count");
    const { index: guess, reason } = comboFrom(match[1]);
    if (reason) return problem(number, joined, reason);
    const feedback = Number(match[2]);
    if (feedback > FIELDS.length) return problem(number, joined, `Mismatched ${match[2]} is more than ${FIELDS.length}`);
    entries.push({ number, guess, feedback });
  };

  String(text)
    .split(/\r\n|\r|\n/)
    .forEach((raw, i) => {
      const line = raw.trim();
      const number = i + 1;
      if (line === "") return;
      if (pending && INPUT_CONTINUATION.test(line)) {
        pending.parts.push(line);
        return;
      }
      finish();
      if (INPUT_START.test(line)) {
        pending = { number, parts: [line] };
        return;
      }
      if (OPTIONS.test(line)) return;
      const attempts = line.match(ATTEMPTS);
      if (attempts) {
        const total = Number(attempts[2] ?? attempts[1]);
        const counts = attempts[2] !== undefined || entries.length === 0;
        if (!counts || limit !== null) return;
        if (total < 1 || total > maxLimit) problem(number, line, `attempts must be from 1 to ${maxLimit}`);
        else limit = total;
        return;
      }
      problem(number, line, "not an Input, Result, Mismatched, Attempts or option line");
    });
  finish();

  const history = [];
  for (const { number, guess, feedback } of entries) {
    if (history.at(-1)?.feedback === 0) {
      problem(number, "", "a move after the hit");
      break;
    }
    history.push({ guess, feedback });
    if (candidatesFor(history).length === 0) {
      problem(number, "", "no target fits this move with the earlier ones");
      break;
    }
  }
  const overflow =
    limit !== null && entries.length > limit
      ? { at: limit, reason: `${entries.length} moves do not fit in ${limit} attempts` }
      : entries.length > maxLimit
        ? { at: maxLimit, reason: `more than ${maxLimit} moves` }
        : null;
  if (overflow && !problems.some(({ number }) => number === entries[overflow.at].number)) problem(entries[overflow.at].number, "", overflow.reason);

  problems.sort((a, b) => a.number - b.number);
  return { history, limit, problems };
}
