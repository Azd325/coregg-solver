import { COMBOS, FIELDS, MAX_TRIES, comboIndex, comboValues, candidatesFor, filterCandidates, play, roundState } from "./solver.js";

const $ = (id) => document.getElementById(id);
const FEEDBACKS = [0, 1, 2, 3, 4];

let history = [];
let state = roundState(history);
let manual = [];
let conflict = "";

const label = (index) => comboValues(index).join(" ");
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function submit(guess, feedback) {
  if (state.solved || state.triesLeft === 0) return;
  const result = play(history, guess, feedback);
  if (result.conflict) {
    conflict = `Conflict: no target fits ${label(guess)} with ${feedback} mismatched. Nothing logged.`;
  } else {
    history = result.history;
    conflict = "";
    state = roundState(history);
    resetManual();
  }
  render();
}

function undo() {
  if (history.length === 0) return;
  history = history.slice(0, -1);
  conflict = "";
  state = roundState(history);
  resetManual();
  render();
}

function reset() {
  history = [];
  conflict = "";
  state = roundState(history);
  resetManual();
  render();
}

function renderScore() {
  $("tries").textContent = state.triesLeft;
  $("count").textContent = state.candidates.length;
}

function renderMove() {
  const { move, solved, triesLeft, candidates } = state;
  const last = history.at(-1);
  const shown = solved ? last.guess : move?.guess;
  const previous = solved ? undefined : last?.guess;

  $("move").dataset.mode = solved ? "solved" : move ? "play" : "over";
  $("move-title").textContent = solved ? "Cracked" : move ? `Attempt ${history.length + 1} of ${MAX_TRIES}` : "Out of attempts";
  $("move-odds").textContent = move ? `Solves ${move.hits} of ${candidates.length} in ${plural(triesLeft, "try", "tries")}` : "";

  $("cols").replaceChildren(
    ...FIELDS.map((field, f) => {
      const value = shown === undefined ? undefined : COMBOS[shown][f];
      const changed = move !== null && (previous === undefined || value !== COMBOS[previous][f]);
      const col = element("div", changed ? "col changed" : "col");
      col.append(
        element("span", "col-name", field.name),
        element("span", "col-value", value === undefined ? "?" : field.values[value]),
        element("span", "col-place", value === undefined ? "" : `${value + 1} of ${field.values.length}`),
      );
      return col;
    }),
  );

  let note;
  if (solved) note = `Cracked in ${plural(history.length, "attempt", "attempts")}. Press N for a new round.`;
  else if (!move) note = `${plural(candidates.length, "target", "targets")} left. Press N for a new round.`;
  else if (!candidates.includes(move.guess)) note = "A probe: it cannot be the target, but it splits the rest best.";
  else if (triesLeft === 1) note = "Last attempt: one of the possible targets.";
  else if (previous === undefined) note = "Opening move: set all four fields in the game.";
  else note = "Change the lit fields in the game.";
  $("move-note").textContent = conflict || note;
  $("move-note").classList.toggle("error", conflict !== "");
}

function renderKeys(container, guess, onPick, withShortcut) {
  container.replaceChildren(
    ...FEEDBACKS.map((feedback) => {
      const remaining = guess === undefined ? 0 : filterCandidates(state.candidates, guess, feedback).length;
      const key = element("button", feedback === 0 ? "key hit" : "key");
      key.type = "button";
      key.disabled = guess === undefined;
      if (remaining === 0) key.classList.add("dead");
      if (withShortcut) key.setAttribute("aria-keyshortcuts", String(feedback));
      key.setAttribute("aria-label", `${feedback} mismatched, ${feedback === 0 ? "a hit" : `${remaining} left`}`);
      key.append(element("span", "key-n", String(feedback)));
      if (withShortcut) key.append(element("span", "key-sub", feedback === 0 ? "hit" : `${remaining} left`));
      key.addEventListener("click", () => onPick(feedback));
      return key;
    }),
  );
}

function renderHistory() {
  $("history").replaceChildren(
    ...Array.from({ length: MAX_TRIES }, (_, i) => {
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
  renderKeys($("manual-feedback"), guess, (feedback) => submit(guess, feedback), false);
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
  state = roundState(history);
  renderScore();
  renderMove();
  renderKeys($("feedback"), state.move?.guess, (feedback) => submit(state.move.guess, feedback), true);
  $("undo").disabled = history.length === 0;
  renderHistory();
  renderManual();
  renderCandidates();
}

document.addEventListener("keydown", (event) => {
  if (event.repeat || event.metaKey || event.ctrlKey || event.altKey) return;
  const key = event.key.toLowerCase();
  if (/^[0-4]$/.test(key) && state.move) {
    event.preventDefault();
    submit(state.move.guess, Number(key));
  } else if (key === "u" || key === "backspace") {
    event.preventDefault();
    undo();
  } else if (key === "n") {
    event.preventDefault();
    reset();
  }
});

$("undo").addEventListener("click", undo);
$("reset").addEventListener("click", reset);
state = roundState(history);
resetManual();
render();
