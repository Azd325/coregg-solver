import { CATEGORIES, HARDWARE, SOFTWARE, analyzeLoadout } from "./loadout.js";

const $ = (id) => document.getElementById(id);
const credits = (n) => `${n.toLocaleString("en-US")} CR`;
const amount = (n, unit) => (unit ? `${n} ${unit}` : String(n));
const round = (n) => Math.round(n * 1000) / 1000;
const listWords = (words) => (words.length < 2 ? words.join("") : `${words.slice(0, -1).join(", ")} and ${words.at(-1)}`);

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

const selects = {};
const boxes = [];

function buildParts() {
  $("loadout-parts").replaceChildren(
    ...CATEGORIES.flatMap((category) => {
      const id = `loadout-${category.toLowerCase()}`;
      const label = element("label", "", category);
      label.htmlFor = id;
      const select = element("select", "loadout-select");
      select.id = id;
      select.append(element("option", "", `Pick a ${category}`));
      select.options[0].value = "";
      for (const part of HARDWARE.filter((item) => item.category === category)) {
        const option = element("option", "", `${part.name} (${part.price ? credits(part.price) : "not sold"})`);
        option.value = part.name;
        select.append(option);
      }
      select.addEventListener("change", render);
      selects[category] = select;
      return [label, select];
    }),
  );
}

function buildPrograms() {
  $("loadout-programs").replaceChildren(
    ...SOFTWARE.map((program, index) => {
      const id = `loadout-program-${index}`;
      const input = element("input");
      Object.assign(input, { type: "checkbox", id, value: program.name });
      input.addEventListener("change", render);
      boxes.push(input);
      const abilities = program.abilities.map((a) => `${a.type} ${a.power[0]}–${a.power[1]}`).join(", ");
      const facts = `${abilities} · ${credits(program.price)}${program.consumption ? "" : " · no consumption data"}`;
      const label = element("label", "loadout-program");
      label.htmlFor = id;
      label.append(element("span", "loadout-program-name", program.name), element("span", "loadout-program-facts", facts));
      const item = element("li");
      item.append(input, label);
      return item;
    }),
  );
}

function summary({ boot, missing, unchecked, resources, power }) {
  if (missing.length === CATEGORIES.length) return "Pick a CPU, GPU, RAM and PSU.";
  if (missing.length) return `Pick a ${listWords(missing)} to check the boot.`;
  if (boot === "no") {
    const short = resources.filter((r) => !r.fits).map((r) => `${r.label} short by ${amount(round(r.demand - r.supply), r.unit)}`);
    if (!power.fits) short.push(`power short by ${-power.headroom} kW`);
    const text = listWords(short);
    return `No boot. ${text[0].toUpperCase()}${text.slice(1)}.`;
  }
  if (boot === "unknown") return `Cannot tell. No consumption data for ${listWords(unchecked)}. Everything else fits.`;
  return "Boots. Every resource and the PSU fit.";
}

function row(name, need, have, left, fits) {
  const tr = element("tr", fits ? "" : "short");
  tr.append(element("td", "", name), ...[need, have, left].map((n) => element("td", "num", String(n))));
  return tr;
}

function render() {
  const parts = Object.fromEntries(CATEGORIES.map((c) => [c, HARDWARE.find((p) => p.name === selects[c].value)]));
  const software = SOFTWARE.filter((_, i) => boxes[i].checked);
  const analysis = analyzeLoadout(parts, software);
  const empty = analysis.missing.length === CATEGORIES.length && software.length === 0;

  $("loadout-clear").disabled = empty;
  const note = $("loadout-summary");
  note.textContent = summary(analysis);
  note.classList.toggle("error", analysis.boot === "no" && analysis.missing.length === 0);
  $("loadout-table").hidden = empty;
  $("loadout-resources").replaceChildren(
    ...analysis.resources.map((r) => row(r.unit ? `${r.label} (${r.unit})` : r.label, r.demand, r.supply, round(r.supply - r.demand), r.fits)),
    row("PSU power (kW)", analysis.power.draw, analysis.power.output, analysis.power.headroom, analysis.power.fits),
  );
  $("loadout-price").textContent = empty ? "" : `Total price: ${credits(analysis.price)}`;
}

function clear() {
  for (const select of Object.values(selects)) select.value = "";
  for (const box of boxes) box.checked = false;
  render();
  selects.CPU.focus();
}

buildParts();
buildPrograms();
$("loadout-clear").addEventListener("click", clear);
render();
