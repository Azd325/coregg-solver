import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const cli = fileURLToPath(new URL("../skills/coregg-solver/scripts/loadout.mjs", import.meta.url));
const run = (...args) => spawnSync("node", [cli, ...args], { encoding: "utf8" });
const STARTER = ["--cpu", "M-Mate J12-40", "--gpu", "OmniPix 23.2", "--ram", "Emerald H2S9", "--psu", "1Y Series 1550 2kW"];

for (const file of ["loadout.js", "loadout-data.js"]) {
  test(`skill ${file} is identical to public/${file}`, () => {
    const skillCopy = readFileSync(new URL(`../skills/coregg-solver/scripts/${file}`, import.meta.url));
    assert.ok(skillCopy.equals(readFileSync(new URL(`../public/${file}`, import.meta.url))));
  });
}

test("check prints the verdict, every resource, the PSU and the price", () => {
  const result = run("check", ...STARTER, "--software", "seeker-iv v0.6", "--software", "Cypher+ v1.4");
  assert.equal(result.status, 0);
  assert.equal(
    result.stdout,
    [
      "boot: no",
      "reason: ramMemory short by 0.2 TB",
      "resources[6]{resource,demand,supply,fits}:",
      "  cpuFrequency,5,7.2,true",
      "  cpuCores,3,8,true",
      "  gpuPower,0.44,0.88,true",
      "  gpuMemory,0.5,1,true",
      "  ramFrequency,0.52,0.77,true",
      "  ramMemory,4.2,4,false",
      "power:",
      "  draw: 1.8",
      "  output: 2",
      "  headroom: 0.2",
      "  fits: true",
      "price: 17020",
      "",
    ].join("\n"),
  );
});

test("check says boot unknown and names the program it cannot check", () => {
  const result = run("check", "--cpu", "M-Mate J12-40", "--gpu", "OmniPix 23.2", "--ram", "Emerald H3S12", "--psu", "1Y Series 1550 2kW", "--software", "Porter-triX lr8");
  assert.equal(result.status, 0);
  assert.match(result.stdout, /^boot: unknown\nreason: no consumption data for Porter-triX lr8; everything else fits\nunchecked\[1\]: Porter-triX lr8\n/);
});

test("check names a missing part and a PSU shortfall", () => {
  assert.match(run("check", "--cpu", "UNO 6.651").stdout, /^boot: no\nreason: "missing GPU, RAM, PSU"\nmissing\[3\]: GPU,RAM,PSU\n/);
  const power = run("check", "--cpu", "Hex Lattice 14+", "--gpu", "Force Industry 22C", "--ram", "Emerald H2S9", "--psu", "Quartz 28-BR");
  assert.match(power.stdout, /^boot: no\nreason: power short by 0.6 kW\n/);
  assert.match(power.stdout, /\nprice: 107635\n$/);
});

test("an unknown item name exits 1 on stdout and lists the valid names", () => {
  const result = run("check", "--cpu", "Pentium");
  assert.equal(result.status, 1);
  assert.equal(result.stderr, "");
  assert.match(result.stdout, /^error: no CPU named Pentium\nvalidNames\[6\]: M-Mate J12-40,UNO 6.651,/);
});

test("usage errors exit 2: unknown flag, unknown command, flag without value, a part given twice", () => {
  const flag = run("check", "--cpus", "UNO 6.651");
  assert.equal(flag.status, 2);
  assert.match(flag.stdout, /^error: unknown flag --cpus for check\nvalidFlags\[5\]: "--cpu","--gpu","--ram","--psu","--software"\n/);
  assert.equal(run("simulate").status, 2);
  assert.equal(run("check", "--cpu").status, 2);
  assert.equal(run("check", "--cpu", "UNO 6.651", "--cpu", "M-Mate J12-40").status, 2);
  assert.match(run("list", "--category", "ssd").stdout, /^error: unknown category ssd\n/);
});

test("the same program twice is an error, not a double demand", () => {
  const result = run("check", ...STARTER, "--software", "Cypher+ v1.4", "--software", "cypher+ v1.4");
  assert.equal(result.status, 1);
  assert.match(result.stdout, /^error: Cypher\+ v1\.4 is listed twice\n/);
});

test("the home view shows the whole catalog with counts and next steps", () => {
  const result = run();
  assert.equal(result.status, 0);
  for (const header of ["cpu[6]", "gpu[4]", "ram[5]", "psu[4]", "software[13]"]) assert.ok(result.stdout.includes(`\n${header}{`), header);
  assert.match(result.stdout, /^bin: /);
  assert.match(result.stdout, /\n  M-Mate J12-40,1,not sold,7\.2,8,0\.6\n/);
  assert.match(result.stdout, /\n  Porter-triX lr8,3,74760,HACK 12-25,unknown\n/);
  assert.match(result.stdout, /\nhelp\[2\]:\n/);
});

test("list --category shows one table, and view quotes nothing it does not need to", () => {
  const list = run("list", "--category", "PSU");
  assert.match(list.stdout, /\npsu\[4\]\{name,tier,price,powerOutput\}:\n/);
  assert.doesNotMatch(list.stdout, /cpu\[/);
  const view = run("view", "5crypt0l 0j");
  assert.match(view.stdout, /\n  cpuCores,2,6,16\n/);
  assert.match(view.stdout, /\n  DECRYPT,14-46,\.eb54x; \.jjqv,false\n/);
});

test("every command answers --help with its usage", () => {
  for (const command of ["list", "view", "check"]) {
    const result = run(command, "--help");
    assert.equal(result.status, 0);
    assert.match(result.stdout, new RegExp(`^usage: node scripts/loadout\\.mjs ${command}`));
  }
});

test("installed skill folder runs the loadout check under a commonjs project", () => {
  const project = mkdtempSync(join(tmpdir(), "coregg-loadout-"));
  try {
    writeFileSync(join(project, "package.json"), '{"type":"commonjs"}');
    const installed = join(project, ".claude", "skills", "coregg-solver");
    cpSync(fileURLToPath(new URL("../skills/coregg-solver", import.meta.url)), installed, { recursive: true });
    const result = spawnSync("node", [join(installed, "scripts", "loadout.mjs"), "check", ...STARTER], { encoding: "utf8" });
    assert.equal(result.status, 0, result.stdout);
    assert.match(result.stdout, /^boot: yes\n/);
  } finally {
    rmSync(project, { recursive: true, force: true });
  }
});
