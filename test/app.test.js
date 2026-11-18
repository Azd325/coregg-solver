import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { JSDOM } from "jsdom";

const html = readFileSync(new URL("../public/index.html", import.meta.url), "utf8");
let loads = 0;

const RENDERED = ["#move", "#feedback", "#history", "#candidates", "#undo", "#tries", "#tries-down", "#tries-up", "#count"];
const snapshot = (document) =>
  Object.fromEntries(RENDERED.map((selector) => [selector, document.querySelector(selector).outerHTML.replace(/>\s+</g, "><")]));

async function openApp() {
  const dom = new JSDOM(html);
  const { document } = dom.window;
  globalThis.document = document;
  const staticMarkup = snapshot(document);
  await import(`../public/app.js?load=${loads++}`);
  const press = (key, target = document.body) =>
    target.dispatchEvent(new dom.window.KeyboardEvent("keydown", { key, bubbles: true }));
  const text = (selector) => document.querySelector(selector).textContent;
  const pick = (field, value) => {
    const input = [...document.querySelectorAll(`#manual-fields input[name="manual-${field}"]`)].find((i) => i.value === value);
    input.checked = true;
    input.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
    return input;
  };
  const historyRows = () => [...document.querySelectorAll("#history tr")].map((row) => row.textContent);
  return { document, press, text, pick, historyRows, staticMarkup };
}

test("keys 0-4 log the move picked in the manual panel when focus is inside it", async () => {
  const { press, pick, historyRows } = await openApp();
  const input = pick(0, "v1.1");
  press("0", input);
  assert.match(historyRows()[0], /v1\.1 GET LTE AES/);
});

test("keys 0-4 outside the manual panel still log the recommended move", async () => {
  const { press, pick, historyRows } = await openApp();
  pick(0, "v1.1");
  press("2");
  assert.match(historyRows()[0], /v1\.0 GET LTE AES/);
});

test("a conflict from the manual panel shows next to the panel", async () => {
  const { document, press, text, pick } = await openApp();
  press("1");
  for (const [field, value] of [[0, "v1.0"], [1, "GET"], [2, "LTE"], [3, "AES"]]) pick(field, value);
  document.querySelectorAll("#manual-feedback button")[2].click();
  assert.match(text("#manual-note"), /^Conflict: no target fits v1\.0 GET LTE AES with 2 mismatched/);
  assert.doesNotMatch(text("#move-note"), /Conflict/);
});

test("focus stays on the same key of the same container after a submit", async () => {
  const { document } = await openApp();
  for (const container of ["#feedback", "#manual-feedback"]) {
    document.querySelectorAll(`${container} button`)[3].focus();
    document.activeElement.click();
    assert.equal(document.activeElement, document.querySelectorAll(`${container} button`)[3]);
  }
});

test("focus on a manual radio survives a submit, so the next key still logs the manual pick", async () => {
  const { document, press, pick, historyRows } = await openApp();
  press("1");
  const input = pick(0, "v1.1");
  input.focus();
  press("4", input);
  assert.equal(document.activeElement.id, input.id);
  press("1", document.activeElement);
  assert.match(historyRows()[1], /v1\.1 PUT Fiber RSA/);
});

test("attempts left default to 6 and the history shows one row per attempt", async () => {
  const { text, historyRows } = await openApp();
  assert.equal(text("#tries"), "6");
  assert.equal(historyRows().length, 6);
  assert.equal(text("#move-title"), "Attempt 1 of 6");
});

test("changing attempts left changes the limit and the recommendation", async () => {
  const { document, press, text, historyRows } = await openApp();
  press("1");
  assert.equal(text("#tries"), "5");
  document.getElementById("tries-down").click();
  document.getElementById("tries-down").click();
  document.getElementById("tries-down").click();
  document.getElementById("tries-down").click();
  assert.equal(text("#tries"), "1");
  assert.equal(text("#move-title"), "Attempt 2 of 2");
  assert.equal(historyRows().length, 2);
  assert.match(text("#move-note"), /^Last attempt: one of the possible targets/);
  document.getElementById("tries-up").click();
  assert.equal(text("#tries"), "2");
});

test("page declares a WebApplication and keeps head tags consistent", () => {
  const { document } = new JSDOM(html).window;
  const meta = (selector) => document.querySelector(selector).content;
  const data = JSON.parse(document.querySelector('script[type="application/ld+json"]').textContent);
  assert.equal(data["@type"], "WebApplication");
  assert.equal(data.applicationCategory, "GameApplication");
  assert.equal(data.offers.price, "0");
  assert.equal(data.isAccessibleForFree, true);
  assert.equal(data.description, meta('meta[name="description"]'));
  assert.equal(meta('meta[property="og:description"]'), meta('meta[name="description"]'));
  assert.equal(meta('meta[name="twitter:description"]'), meta('meta[name="description"]'));
  assert.equal(meta('meta[property="og:title"]'), document.title);
  assert.equal(meta('meta[name="twitter:title"]'), document.title);
  assert.match(meta('meta[name="description"]'), /Unofficial fan tool/);
  assert.equal(document.querySelectorAll("#how-title ~ details").length, 4);
});

test("attempts left plus moves played never exceed 8, and New round goes back to 6", async () => {
  const { document, press, text } = await openApp();
  press("2");
  press("3");
  press("2");
  assert.equal(text("#move-title"), "Attempt 4 of 6");
  const up = document.getElementById("tries-up");
  for (let i = 0; i < 10; i++) up.click();
  assert.equal(text("#tries"), "5");
  assert.equal(up.getAttribute("aria-disabled"), "true");
  assert.equal(text("#move-title"), "Attempt 4 of 8");
  document.getElementById("reset").click();
  assert.equal(text("#tries"), "6");
  assert.equal(text("#move-title"), "Attempt 1 of 6");
  assert.equal(up.getAttribute("aria-disabled"), "false");
});

test("move odds name the guesses needed when every target is solvable", async () => {
  const { text } = await openApp();
  assert.equal(text("#move-odds"), "Solves 81 of 81, at most 5 guesses");
});

test("move odds keep the within form when attempts are short", async () => {
  const { document, text } = await openApp();
  const down = document.getElementById("tries-down");
  down.click();
  down.click();
  assert.equal(text("#move-odds"), "Solves 55 of 81 within 4 guesses");
  for (let i = 0; i < 3; i++) down.click();
  assert.equal(text("#move-odds"), "Solves 1 of 81 within 1 guess");
});

test("static opening markup equals what render() produces", async () => {
  const { document, staticMarkup } = await openApp();
  assert.deepEqual(snapshot(document), staticMarkup);
});

test("styles load through link tags in order, not @import", () => {
  const { document } = new JSDOM(html).window;
  const sheets = [...document.querySelectorAll('link[rel="stylesheet"]')].map((link) => link.getAttribute("href"));
  assert.deepEqual(sheets.slice(-3), ["tokens.css", "base.css", "styles.css"]);
  const { document: sheetDocument } = new JSDOM("<style></style>").window;
  const style = sheetDocument.querySelector("style");
  style.textContent = readFileSync(new URL("../public/styles.css", import.meta.url), "utf8");
  const IMPORT_RULE = 3;
  assert.ok(style.sheet.cssRules.length > 0);
  assert.deepEqual([...style.sheet.cssRules].filter((rule) => rule.type === IMPORT_RULE), []);
});

test("fonts are cached as immutable", () => {
  const rules = {};
  let path;
  for (const line of readFileSync(new URL("../public/_headers", import.meta.url), "utf8").split("\n")) {
    if (/^\S/.test(line)) path = line.trim();
    else if (path && /^\s+\S/.test(line)) {
      const [name, ...value] = line.trim().split(":");
      (rules[path] ??= {})[name.toLowerCase()] = value.join(":").trim();
    }
  }
  assert.equal(rules["/fonts/*"]["cache-control"], "public, max-age=31536000, immutable");
});

test("candidates list keeps its list role", () => {
  const { document } = new JSDOM(html).window;
  assert.equal(document.getElementById("candidates").getAttribute("role"), "list");
});

test("feedback keys have no aria-label that differs from their visible text", async () => {
  const { document } = await openApp();
  for (const key of document.querySelectorAll("#feedback button, #manual-feedback button")) {
    assert.equal(key.hasAttribute("aria-label"), false);
    assert.equal(key.getAttribute("aria-describedby"), "keys-title");
  }
});

test("the status note names the next move and the fields to change", async () => {
  const { document, press, text } = await openApp();
  assert.match(text("#move-note"), /Next move: v1\.0 GET LTE AES\.$/);
  press("1");
  assert.equal(
    text("#move-note"),
    "A probe: it cannot be the target, but it splits the rest best. Next move: v1.0 PUT Fiber RSA. Change Method, Channel, Cipher.",
  );
  const changed = [...document.querySelectorAll("#cols .col")].map((col) => col.classList.contains("changed"));
  const hidden = [...document.querySelectorAll("#cols .col")].map((col) => col.querySelector(".visually-hidden")?.textContent === " (change)");
  assert.deepEqual(hidden, changed);
  assert.ok(changed.includes(true) && changed.includes(false));
});

test("focus stays off the page body after undo, a solved round and New round", async () => {
  const { document, press } = await openApp();
  document.getElementById("feedback-2").focus();
  press("2", document.activeElement);
  assert.equal(document.activeElement.id, "feedback-2");

  press("u", document.activeElement);
  assert.equal(document.activeElement.id, "feedback-2");

  document.getElementById("feedback-0").focus();
  press("0", document.activeElement);
  assert.equal(document.activeElement.id, "move-title");

  document.getElementById("undo").focus();
  press("u", document.activeElement);
  assert.equal(document.getElementById("undo").disabled, true);
  assert.equal(document.activeElement.id, "move-title");

  press("2", document.body);
  document.getElementById("reset").focus();
  press("n", document.activeElement);
  assert.equal(document.activeElement.id, "reset");
});

test("focus on a manual radio survives undo", async () => {
  const { document, press, pick } = await openApp();
  press("1");
  const input = pick(0, "v1.1");
  input.focus();
  press("u", input);
  assert.equal(document.activeElement.id, input.id);
});

test("Undo restores the round that New round cleared", async () => {
  const { document, press, text, historyRows } = await openApp();
  press("2");
  press("3");
  document.getElementById("tries-up").click();
  const played = historyRows();
  assert.equal(text("#move-title"), "Attempt 3 of 7");
  document.getElementById("reset").click();
  assert.equal(text("#move-title"), "Attempt 1 of 6");
  assert.equal(document.getElementById("undo").disabled, false);
  press("u");
  assert.deepEqual(historyRows(), played);
  assert.equal(text("#move-title"), "Attempt 3 of 7");
  press("u");
  assert.equal(text("#move-title"), "Attempt 2 of 7");
});

test("a move played in the new round ends the chance to undo New round", async () => {
  const { document, press, text } = await openApp();
  press("2");
  document.getElementById("reset").click();
  press("2");
  press("u");
  assert.equal(text("#move-title"), "Attempt 1 of 6");
  assert.equal(document.getElementById("undo").disabled, true);
});
