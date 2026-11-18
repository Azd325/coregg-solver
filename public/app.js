import { COMBOS, FIELDS, comboIndex, comboValues, candidatesFor, filterCandidates, guessesNeeded, play, roundState } from "./solver.js";

const $ = (id) => document.getElementById(id);
const FEEDBACKS = [0, 1, 2, 3, 4];
const DEFAULT_LIMIT = 6;
const MAX_LIMIT = 8;

let limit = DEFAULT_LIMIT;
let history = [];
let state = roundState(history, limit);
let manual = [];
let conflict = "";
let conflictSource = "";
let previousRound = null;

const label = (index) => comboValues(index).join(" ");
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function submit(guess, feedback, source) {
  if (state.solved || state.triesLeft === 0) return;
  const result = play(history, guess, feedback);
  if (result.conflict) {
    conflict = `Conflict: no target fits ${label(guess)} with ${feedback} mismatched. Nothing logged.`;
    conflictSource = source;
  } else {
    history = result.history;
    previousRound = null;
    conflict = "";
    state = roundState(history, limit);
    resetManual();
  }
  render();
}

function setAttemptsLeft(value) {
  if (value < 0 || value + history.length > MAX_LIMIT || value === state.triesLeft) return;
  limit = value + history.length;
  conflict = "";
  state = roundState(history, limit);
  resetManual();
  render();
}

function undo() {
  if (history.length > 0) {
    history = history.slice(0, -1);
  } else if (previousRound) {
    ({ history, limit } = previousRound);
    previousRound = null;
  } else {
    return;
  }
  conflict = "";
  state = roundState(history, limit);
  resetManual();
  render();
}

function reset() {
  if (history.length > 0) previousRound = { history, limit };
  history = [];
  limit = DEFAULT_LIMIT;
  conflict = "";
  state = roundState(history, limit);
  resetManual();
  render();
}

function renderScore() {
  $("tries").textContent = state.triesLeft;
  $("tries-down").setAttribute("aria-disabled", String(state.triesLeft <= 0));
  $("tries-up").setAttribute("aria-disabled", String(limit >= MAX_LIMIT));
  $("count").textContent = state.candidates.length;
}

function moveOdds({ hits }, candidates, triesLeft) {
  const solvesAll = hits === candidates.length;
  const guesses = solvesAll ? guessesNeeded(candidates, triesLeft) : triesLeft;
  return `Solves ${hits} of ${candidates.length}${solvesAll ? ", at most" : " within"} ${plural(guesses, "guess", "guesses")}`;
}

function renderMove() {
  const { move, solved, triesLeft, candidates } = state;
  const last = history.at(-1);
  const shown = solved ? last.guess : move?.guess;
  const previous = solved ? undefined : last?.guess;

  $("move").dataset.mode = solved ? "solved" : move ? "play" : "over";
  $("move-title").textContent = solved ? "Cracked" : move ? `Attempt ${history.length + 1} of ${limit}` : "Out of attempts";
  $("move-odds").textContent = move ? moveOdds(move, candidates, triesLeft) : "";

  $("cols").replaceChildren(
    ...FIELDS.map((field, f) => {
      const value = shown === undefined ? undefined : COMBOS[shown][f];
      const changed = move !== null && (previous === undefined || value !== COMBOS[previous][f]);
      const col = element("div", changed ? "col changed" : "col");
      const name = element("span", "col-name", field.name);
      if (changed) name.append(element("span", "visually-hidden", " (change)"));
      col.append(
        name,
        element("span", "col-value", value === undefined ? "?" : field.values[value]),
        element("span", "col-place", value === undefined ? "" : `${value + 1} of ${field.values.length}`),
      );
      return col;
    }),
  );

  const changedNames = FIELDS.filter((_, f) => move && previous !== undefined && COMBOS[move.guess][f] !== COMBOS[previous][f]).map((field) => field.name);
  let note;
  if (solved) note = `Cracked in ${plural(history.length, "attempt", "attempts")}. Press N for a new round.`;
  else if (!move) note = `${plural(candidates.length, "target", "targets")} left. Press N for a new round, or raise attempts left if the game shows more.`;
  else if (!candidates.includes(move.guess)) note = "A probe: it cannot be the target, but it splits the rest best.";
  else if (triesLeft === 1) note = "Last attempt: one of the possible targets.";
  else if (previous === undefined) note = "Opening move: set all four fields in the game.";
  else note = "Change the lit fields in the game.";
  if (move) note += ` Next move: ${label(move.guess)}.${changedNames.length ? ` Change ${changedNames.join(", ")}.` : ""}`;
  const mainConflict = conflictSource === "manual" ? "" : conflict;
  $("move-note").textContent = mainConflict || note;
  $("move-note").classList.toggle("error", mainConflict !== "");
  $("manual-note").textContent = conflictSource === "manual" ? conflict : "";
}

function renderKeys(container, guess, onPick, withShortcut) {
  container.replaceChildren(
    ...FEEDBACKS.map((feedback) => {
      const remaining = guess === undefined ? 0 : filterCandidates(state.candidates, guess, feedback).length;
      const key = element("button", feedback === 0 ? "key hit" : "key");
      key.type = "button";
      key.id = `${container.id}-${feedback}`;
      key.disabled = guess === undefined;
      if (remaining === 0) key.classList.add("dead");
      if (withShortcut) key.setAttribute("aria-keyshortcuts", String(feedback));
      key.setAttribute("aria-describedby", "keys-title");
      key.append(element("span", "key-n", String(feedback)));
      if (withShortcut) key.append(element("span", "key-sub", feedback === 0 ? "hit" : `${remaining} left`));
      key.addEventListener("click", () => onPick(feedback));
      return key;
    }),
  );
}

function renderHistory() {
  $("history").replaceChildren(
    ...Array.from({ length: limit }, (_, i) => {
      const entry = history[i];
      const row = element("tr", entry ? (entry.feedback === 0 ? "hit" : "") : "empty");
      const left = entry ? candidatesFor(history.slice(0, i + 1)).length : undefined;
      row.append(
        element("td", "num", String(i + 1)),
        element("td", "move-cell", entry ? label(entry.guess) : "Not played"),
        element("td", "num", entry ? String(entry.feedback) : ""),
        element("td", "num", entry ? (entry.feedback === 0 ? "hit" : String(left)) : ""),
      );
      return row;
    }),
  );
}

function renderManual() {
  const open = !state.solved && state.triesLeft > 0;
  $("manual-fields").replaceChildren(
    ...FIELDS.map((field, f) => {
      const group = element("fieldset", "seg");
      group.append(element("legend", "", field.name));
      field.values.forEach((value, v) => {
        const id = `manual-${f}-${v}`;
        const input = element("input");
        Object.assign(input, { type: "radio", name: `manual-${f}`, id, value, checked: manual[f] === value, disabled: !open });
        input.addEventListener("change", () => {
          manual[f] = value;
          renderManualKeys(open);
        });
        const text = element("label", "", value);
        text.htmlFor = id;
        group.append(input, text);
      });
      return group;
    }),
  );
  renderManualKeys(open);
}

function renderManualKeys(open) {
  const guess = open ? comboIndex(manual) : undefined;
  renderKeys($("manual-feedback"), guess, (feedback) => submit(guess, feedback, "manual"), false);
}

function renderCandidates() {
  const { candidates, move } = state;
  $("candidates").replaceChildren(
    ...candidates.map((c) => element("li", c === move?.guess ? "pick" : "", label(c))),
  );
}

function resetManual() {
  manual = comboValues(state.move?.guess ?? history.at(-1)?.guess ?? 0);
}

function render() {
  const focusedId = document.activeElement?.id;
  renderScore();
  renderMove();
  renderKeys($("feedback"), state.move?.guess, (feedback) => submit(state.move.guess, feedback, "main"), true);
  $("undo").disabled = history.length === 0 && !previousRound;
  renderHistory();
  renderManual();
  renderCandidates();
  restoreFocus(focusedId);
}

function restoreFocus(id) {
  const active = document.activeElement;
  if (!id || (active && active !== document.body && !active.disabled)) return;
  const target = $(id);
  (target && !target.disabled ? target : $("move-title")).focus();
}

document.addEventListener("keydown", (event) => {
  if (event.repeat || event.metaKey || event.ctrlKey || event.altKey) return;
  const key = event.key.toLowerCase();
  const inManual = Boolean(event.target.closest?.("#manual"));
  const guess = inManual ? comboIndex(manual) : state.move?.guess;
  if (/^[0-4]$/.test(key) && guess !== undefined && !state.solved && state.triesLeft > 0) {
    event.preventDefault();
    submit(guess, Number(key), inManual ? "manual" : "main");
  } else if (key === "u" || key === "backspace") {
    event.preventDefault();
    undo();
  } else if (key === "n") {
    event.preventDefault();
    reset();
  }
});

$("tries-down").addEventListener("click", () => setAttemptsLeft(state.triesLeft - 1));
$("tries-up").addEventListener("click", () => setAttemptsLeft(state.triesLeft + 1));
$("undo").addEventListener("click", undo);
$("reset").addEventListener("click", reset);
resetManual();
render();
