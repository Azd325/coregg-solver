import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { JSDOM } from "jsdom";

const html = readFileSync(new URL("../public/index.html", import.meta.url), "utf8");
let loads = 0;

async function openPage() {
  const dom = new JSDOM(html);
  const { document } = dom.window;
  globalThis.document = document;
  const load = loads++;
  await import(`../public/app.js?panel=${load}`);
  await import(`../public/loadout-panel.js?panel=${load}`);
  const text = (id) => document.getElementById(id).textContent;
  const choose = (category, name) => {
    const select = document.getElementById(`loadout-${category}`);
    select.value = name;
    select.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
    return select;
  };
  const tick = (name) => {
    const box = [...document.querySelectorAll("#loadout-programs input")].find((input) => input.value === name);
    box.checked = true;
    box.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
    return box;
  };
  const rows = () => [...document.querySelectorAll("#loadout-resources tr")].map((tr) => [...tr.cells].map((td) => td.textContent));
  const press = (key, target) => target.dispatchEvent(new dom.window.KeyboardEvent("keydown", { key, bubbles: true }));
  return { document, text, choose, tick, rows, press };
}

const STARTER = { cpu: "M-Mate J12-40", gpu: "OmniPix 23.2", ram: "Emerald H2S9", psu: "1Y Series 1550 2kW" };

test("the panel starts empty and asks for all four parts", async () => {
  const { document, text } = await openPage();
  assert.equal(text("loadout-summary"), "Pick a CPU, GPU, RAM and PSU.");
  assert.equal(document.getElementById("loadout-table").hidden, true);
  assert.equal(document.getElementById("loadout-clear").disabled, true);
  assert.equal(document.querySelectorAll("#loadout-cpu option").length, 7);
  assert.equal(document.querySelectorAll("#loadout-programs input").length, 13);
});

test("a starter rig with Seeker-IV and Cypher+ shows the RAM shortfall, the PSU row and the price", async () => {
  const { document, text, choose, tick, rows } = await openPage();
  for (const [category, name] of Object.entries(STARTER)) choose(category, name);
  tick("Seeker-IV v0.6");
  tick("Cypher+ v1.4");
  assert.equal(text("loadout-summary"), "No boot. RAM memory short by 0.2 TB.");
  assert.ok(document.getElementById("loadout-summary").classList.contains("error"));
  assert.deepEqual(rows().at(-2), ["RAM memory (TB)", "4.2", "4", "-0.2"]);
  assert.deepEqual(rows().at(-1), ["PSU power (kW)", "1.8", "2", "0.2"]);
  assert.equal(document.querySelectorAll("#loadout-resources tr.short").length, 1);
  assert.equal(text("loadout-price"), "Total price: 17,020 CR");
});

test("a fitting loadout boots, and a program without data turns it into cannot tell", async () => {
  const { text, choose, tick } = await openPage();
  for (const [category, name] of Object.entries({ ...STARTER, ram: "Emerald H3S12" })) choose(category, name);
  tick("Cypher+ v1.4");
  assert.equal(text("loadout-summary"), "Boots. Every resource and the PSU fit.");
  tick("Porter-triX lr8");
  assert.equal(text("loadout-summary"), "Cannot tell. No consumption data for Porter-triX lr8. Everything else fits.");
});

test("a partial pick names the missing parts, and Clear loadout empties the panel", async () => {
  const { document, text, choose } = await openPage();
  choose("cpu", "UNO 6.651");
  choose("ram", "Emerald H2S9");
  assert.equal(text("loadout-summary"), "Pick a GPU and PSU to check the boot.");
  document.getElementById("loadout-clear").click();
  assert.equal(document.getElementById("loadout-cpu").value, "");
  assert.equal(text("loadout-summary"), "Pick a CPU, GPU, RAM and PSU.");
  assert.equal(document.activeElement.id, "loadout-cpu");
});

test("Config Hack keys pressed inside the loadout panel do nothing to the round", async () => {
  const { document, choose, tick, press } = await openPage();
  const select = choose("cpu", "UNO 6.651");
  const box = tick("Cypher+ v1.4");
  for (const key of ["2", "n", "u"]) {
    press(key, select);
    press(key, box);
  }
  assert.match(document.querySelector("#history tr").textContent, /Not played/);
  assert.equal(document.getElementById("tries").textContent, "6");
});

test("program cards show power as a range, never one value", async () => {
  const { document } = await openPage();
  const facts = [...document.querySelectorAll(".loadout-program-facts")].map((node) => node.textContent);
  assert.ok(facts.includes("DECRYPT 8–25 · 6,440 CR"));
  assert.ok(facts.includes("HACK 12–25 · 74,760 CR · no consumption data"));
});
