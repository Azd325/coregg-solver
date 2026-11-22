#!/usr/bin/env node
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";
import { CATEGORIES, HARDWARE, RESOURCES, SOFTWARE, analyzeLoadout, findItem } from "./loadout.js";

const RUN = "node scripts/loadout.mjs";
const KINDS = [...CATEGORIES.map((c) => c.toLowerCase()), "software"];
const CHECK_HELP = `Run \`${RUN} check --cpu "<name>" --gpu "<name>" --ram "<name>" --psu "<name>" --software "<name>"\` to test a loadout`;
const VIEW_HELP = `Run \`${RUN} view "<name>"\` for market, reputation, vulnerability and consumption`;

const HELP = {
  home: `usage: ${RUN} <command>
commands:
  list    Show every part and program (--category ${KINDS.join("|")})
  view    Show every fact about one item: ${RUN} view "<name>"
  check   Test a loadout for boot, resources, PSU headroom and price
Run \`${RUN} <command> --help\` for its flags.`,
  list: `usage: ${RUN} list [--category ${KINDS.join("|")}]
flags:
  --category  Show one table only (default: all five)
examples:
  ${RUN} list
  ${RUN} list --category software`,
  view: `usage: ${RUN} view "<name>"
Prints one part or program with every fact the catalog holds. Names ignore case.
examples:
  ${RUN} view "UNO 6.651"
  ${RUN} view "Porter-lite r4"`,
  check: `usage: ${RUN} check --cpu "<name>" --gpu "<name>" --ram "<name>" --psu "<name>" [--software "<name>" ...]
flags:
  --cpu, --gpu, --ram, --psu  One part each. A missing part means no boot.
  --software                  One program per flag; repeat it for more programs.
output: boot (yes|no|unknown), reason, resources (demand vs supply), power (kW), price (credits).
boot is unknown when every checked number fits but a program has no consumption data.
examples:
  ${RUN} check --cpu "M-Mate J12-40" --gpu "OmniPix 23.2" --ram "Emerald H3S12" --psu "1Y Series 1550 2kW" --software "Cypher+ v1.4"
  ${RUN} check --cpu "UNO 6.651" --gpu "OmniPix 23.2" --ram "Emerald H2S9" --psu "Quartz 28-BR"`,
};

const NUMERIC = /^-?\d+(?:\.\d+)?(?:e[+-]?\d+)?$/i;

function scalar(value) {
  if (value === null || value === undefined) return "null";
  if (typeof value === "number") return String(Object.is(value, -0) ? 0 : value);
  if (typeof value === "boolean") return String(value);
  const text = String(value);
  const quote = text === "" || /^\s|\s$/.test(text) || /[:,"\\[\]{}\n\r\t]/.test(text) || /^(true|false|null)$/.test(text) || NUMERIC.test(text) || text.startsWith("-");
  return quote ? JSON.stringify(text) : text;
}

function toon(object, indent = "") {
  const lines = [];
  for (const [key, value] of Object.entries(object)) {
    if (value === undefined) continue;
    if (Array.isArray(value) && value.length && typeof value[0] === "object") {
      const fields = Object.keys(value[0]);
      lines.push(`${indent}${key}[${value.length}]{${fields.join(",")}}:`);
      for (const row of value) lines.push(`${indent}  ${fields.map((f) => scalar(row[f])).join(",")}`);
    } else if (Array.isArray(value)) {
      lines.push(`${indent}${key}[${value.length}]:${value.length ? ` ${value.map(scalar).join(",")}` : ""}`);
    } else if (value !== null && typeof value === "object") {
      lines.push(`${indent}${key}:`, ...toon(value, `${indent}  `));
    } else {
      lines.push(`${indent}${key}: ${scalar(value)}`);
    }
  }
  return lines;
}

function print(object, help = []) {
  const lines = toon(object);
  if (help.length) lines.push(`help[${help.length}]:`, ...help.map((line) => `  ${line}`));
  console.log(lines.join("\n"));
}

function fail(code, error, extra = {}, help = []) {
  print({ error, ...extra }, help);
  process.exit(code);
}

function parseFlags(command, args, spec) {
  const flags = {};
  const positional = [];
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (!arg.startsWith("--")) {
      positional.push(arg);
      continue;
    }
    const name = arg.slice(2);
    if (!(name in spec)) {
      const valid = Object.keys(spec).map((flag) => `--${flag}`);
      fail(2, `unknown flag ${arg} for ${command}`, { validFlags: valid.length ? valid : ["none"] }, [`Run \`${RUN} ${command} --help\` for usage`]);
    }
    const value = args[++i];
    if (value === undefined || value.startsWith("--")) fail(2, `${arg} needs a value`, {}, [`Run \`${RUN} ${command} --help\` for usage`]);
    if (spec[name] === "many") (flags[name] ??= []).push(value);
    else if (name in flags) fail(2, `${arg} given twice`);
    else flags[name] = value;
  }
  return { flags, positional };
}

const price = (item) => item.price ?? "not sold";
const range = ([low, high]) => `${low}-${high}`;
const abilities = (item) => item.abilities.map((a) => `${a.type} ${range(a.power)}`).join("; ");

const TABLES = {
  cpu: (items) => items.map((p) => ({ name: p.name, tier: p.tier, price: price(p), cpuFrequency: p.cpuFrequency, cpuCores: p.cpuCores, powerDraw: p.powerDraw })),
  gpu: (items) => items.map((p) => ({ name: p.name, tier: p.tier, price: price(p), gpuPower: p.gpuPower, gpuMemory: p.gpuMemory, powerDraw: p.powerDraw })),
  ram: (items) => items.map((p) => ({ name: p.name, tier: p.tier, price: price(p), ramFrequency: p.ramFrequency, ramMemory: p.ramMemory })),
  psu: (items) => items.map((p) => ({ name: p.name, tier: p.tier, price: price(p), powerOutput: p.powerOutput })),
  software: (items) => items.map((s) => ({ name: s.name, tier: s.tier, price: s.price, abilities: abilities(s), consumption: s.consumption ? "known" : "unknown" })),
};

function catalog(only) {
  const tables = {};
  for (const kind of only ? [only] : KINDS) {
    const items = kind === "software" ? SOFTWARE : HARDWARE.filter((p) => p.category === kind.toUpperCase());
    tables[kind] = TABLES[kind](items);
  }
  return tables;
}

const UNITS = "frequency GHz, gpuPower PFLOPS, memory TB, power kW, price credits";

function home() {
  print(
    {
      bin: fileURLToPath(import.meta.url).replace(homedir(), "~"),
      description: "Checks a COR3 loadout (one CPU, GPU, RAM and PSU plus software) for boot, resource demand, PSU headroom and price",
      units: UNITS,
      ...catalog(),
    },
    [CHECK_HELP, VIEW_HELP],
  );
}

function list(args) {
  const { flags, positional } = parseFlags("list", args, { category: "one" });
  if (positional.length) fail(2, `list takes no arguments, got ${positional.join(" ")}`, {}, [`Run \`${RUN} list --category <kind>\``]);
  const kind = flags.category?.toLowerCase();
  if (kind !== undefined && !KINDS.includes(kind)) fail(2, `unknown category ${flags.category}`, { validCategories: KINDS });
  print({ units: UNITS, ...catalog(kind) }, [CHECK_HELP, VIEW_HELP]);
}

function lookup(items, name, what) {
  const item = findItem(items, name);
  if (!item) fail(1, `no ${what} named ${name}`, { validNames: items.map((i) => i.name) });
  return item;
}

function view(args) {
  const { positional } = parseFlags("view", args, {});
  if (positional.length !== 1) fail(2, "view needs exactly one item name", {}, [`Run \`${RUN} view "<name>"\``]);
  const name = positional[0];
  const part = findItem(HARDWARE, name);
  if (part) return print({ item: part });
  const { abilities: list, consumption, ...facts } = lookup(SOFTWARE, name, "part or program");
  print({
    item: { category: "software", ...facts },
    abilities: list.map((a) => ({ type: a.type, power: range(a.power), targets: (a.servers ?? a.files).join("; "), remote: a.remote ?? null })),
    consumption: consumption
      ? RESOURCES.map(({ key }) => ({ resource: key, ...consumption[key] }))
      : "unknown: check cannot test this program and reports boot unknown when the rest fits",
  });
}

function reason(analysis) {
  if (analysis.missing.length) return `missing ${analysis.missing.join(", ")}`;
  const short = analysis.resources.filter((r) => !r.fits).map((r) => `${r.key} short by ${Math.round((r.demand - r.supply) * 1000) / 1000}${r.unit ? ` ${r.unit}` : ""}`);
  if (!analysis.power.fits) short.push(`power short by ${-analysis.power.headroom} kW`);
  if (short.length) return short.join("; ");
  if (analysis.unchecked.length) return `no consumption data for ${analysis.unchecked.join(", ")}; everything else fits`;
  return "every resource and the PSU fit";
}

function check(args) {
  const { flags, positional } = parseFlags("check", args, { cpu: "one", gpu: "one", ram: "one", psu: "one", software: "many" });
  if (positional.length) fail(2, `check takes flags only, got ${positional.join(" ")}`, {}, [`Run \`${RUN} check --help\``]);
  if (!CATEGORIES.some((c) => flags[c.toLowerCase()]) && !flags.software) fail(2, "check needs at least one part or program", {}, [CHECK_HELP]);
  const parts = {};
  for (const category of CATEGORIES) {
    const name = flags[category.toLowerCase()];
    if (name !== undefined) parts[category] = lookup(HARDWARE.filter((p) => p.category === category), name, category);
  }
  const software = (flags.software ?? []).map((name) => lookup(SOFTWARE, name, "program"));
  const twice = software.find((item, i) => software.indexOf(item) !== i);
  if (twice) fail(1, `${twice.name} is listed twice`);
  const analysis = analyzeLoadout(parts, software);
  print({
    boot: analysis.boot,
    reason: reason(analysis),
    missing: analysis.missing.length ? analysis.missing : undefined,
    unchecked: analysis.unchecked.length ? analysis.unchecked : undefined,
    resources: analysis.resources.map(({ key, demand, supply, fits }) => ({ resource: key, demand, supply, fits })),
    power: analysis.power,
    price: analysis.price,
  });
}

const COMMANDS = { list, view, check };
const [command, ...rest] = process.argv.slice(2);
if (command === undefined) home();
else if (command === "--help" || command === "-h") console.log(HELP.home);
else if (!(command in COMMANDS)) fail(2, `unknown command ${command}`, { validCommands: Object.keys(COMMANDS) }, [`Run \`${RUN} --help\` for usage`]);
else if (rest.includes("--help") || rest.includes("-h")) console.log(HELP[command]);
else COMMANDS[command](rest);
