import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { JSDOM } from "jsdom";

const html = readFileSync(new URL("../public/index.html", import.meta.url), "utf8");
let loads = 0;

async function openApp() {
  const dom = new JSDOM(html);
  const { document } = dom.window;
  globalThis.document = document;
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
  return { document, press, text, pick, historyRows };
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
