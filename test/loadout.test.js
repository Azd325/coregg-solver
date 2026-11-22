import assert from "node:assert/strict";
import { test } from "node:test";
import { HARDWARE, SOFTWARE, analyzeLoadout, combineDemand, demandFor, findItem } from "../public/loadout.js";

const part = (name) => findItem(HARDWARE, name);
const program = (name) => findItem(SOFTWARE, name);
const rig = (cpu, gpu, ram, psu) => ({ CPU: part(cpu), GPU: part(gpu), RAM: part(ram), PSU: part(psu) });
const STARTER = ["M-Mate J12-40", "OmniPix 23.2", "Emerald H2S9", "1Y Series 1550 2kW"];
const byKey = (analysis) => Object.fromEntries(analysis.resources.map((r) => [r.key, [r.demand, r.supply, r.fits]]));

test("starter rig with Seeker-IV and Cypher+ runs out of RAM memory", () => {
  const analysis = analyzeLoadout(rig(...STARTER), [program("Seeker-IV v0.6"), program("Cypher+ v1.4")]);
  assert.deepEqual(byKey(analysis), {
    cpuFrequency: [5, 7.2, true],
    cpuCores: [3, 8, true],
    gpuPower: [0.44, 0.88, true],
    gpuMemory: [0.5, 1, true],
    ramFrequency: [0.52, 0.77, true],
    ramMemory: [4.2, 4, false],
  });
  assert.deepEqual(analysis.power, { draw: 1.8, output: 2, headroom: 0.2, fits: true });
  assert.equal(analysis.boot, "no");
  assert.equal(analysis.price, 17020);
});

test("Cypher+ v1.4 with Seeker-IV v0.6 uses what the game shows for the pair", () => {
  const analysis = analyzeLoadout(rig("M-Mate J12-40", "Force Recon 13D", "Emerald H3S12", "Quartz 28-BR"), [
    program("Cypher+ v1.4"),
    program("Seeker-IV v0.6"),
  ]);
  assert.deepEqual(byKey(analysis), {
    cpuFrequency: [5, 7.2, true],
    cpuCores: [3, 8, true],
    gpuPower: [0.44, 1.03, true],
    gpuMemory: [0.5, 1.5, true],
    ramFrequency: [0.52, 0.98, true],
    ramMemory: [4.2, 6, true],
  });
  assert.deepEqual(analysis.power, { draw: 2.2, output: 2.8, headroom: 0.6, fits: true });
  assert.equal(analysis.boot, "yes");
  assert.equal(analysis.price, 79235);
});

test("Cypher+ v1.4 with 5CRYPt0L 09 uses what the game shows for the pair", () => {
  const analysis = analyzeLoadout(rig("M-Mate J12-40", "Force Recon 13D", "Emerald H3S12", "Quartz 28-BR"), [
    program("Cypher+ v1.4"),
    program("5CRYPt0L 09"),
  ]);
  assert.deepEqual(byKey(analysis), {
    cpuFrequency: [6.7, 7.2, true],
    cpuCores: [3, 8, true],
    gpuPower: [0.49, 1.03, true],
    gpuMemory: [0.27, 1.5, true],
    ramFrequency: [0.55, 0.98, true],
    ramMemory: [5.9, 6, true],
  });
  assert.deepEqual(analysis.power, { draw: 2.2, output: 2.8, headroom: 0.6, fits: true });
  assert.equal(analysis.boot, "yes");
  assert.equal(analysis.price, 110905);
});

test("the same software boots with the 6 TB Emerald H3S12", () => {
  const analysis = analyzeLoadout(rig("M-Mate J12-40", "OmniPix 23.2", "Emerald H3S12", "1Y Series 1550 2kW"), [
    program("Seeker-IV v0.6"),
    program("Cypher+ v1.4"),
  ]);
  assert.equal(analysis.boot, "yes");
  assert.deepEqual(analysis.missing, []);
  assert.equal(analysis.price, 28405);
});

test("a CPU and GPU that draw more than the PSU gives block the boot", () => {
  const analysis = analyzeLoadout(rig("Hex Lattice 14+", "Force Industry 22C", "Emerald H2S9", "Quartz 28-BR"));
  assert.deepEqual(analysis.power, { draw: 3.4, output: 2.8, headroom: -0.6, fits: false });
  assert.ok(analysis.resources.every((r) => r.fits));
  assert.equal(analysis.boot, "no");
  assert.equal(analysis.price, 107635);
});

test("a draw equal to the PSU output still boots", () => {
  const analysis = analyzeLoadout(rig("UNO 6.651", "OmniPix 23.2", "Emerald H2S9", "1Y Series 1550 2kW"));
  assert.deepEqual(analysis.power, { draw: 2, output: 2, headroom: 0, fits: true });
  assert.equal(analysis.boot, "yes");
});

test("software with unknown consumption makes a fitting loadout unknown, not yes", () => {
  const analysis = analyzeLoadout(rig("M-Mate J12-40", "OmniPix 23.2", "Emerald H3S12", "1Y Series 1550 2kW"), [
    program("Seeker-IV v0.6"),
    program("Cypher+ v1.4"),
    program("Porter-triX lr8"),
  ]);
  assert.equal(analysis.boot, "unknown");
  assert.deepEqual(analysis.unchecked, ["Porter-triX lr8"]);
  assert.equal(byKey(analysis).ramMemory[0], 4.2);
  assert.equal(analysis.price, 103165);
});

test("a known shortfall stays a no even with an unknown program", () => {
  const analysis = analyzeLoadout(rig(...STARTER), [program("Seeker-IV v0.6"), program("Cypher+ v1.4"), program("Porter-triX lr8")]);
  assert.equal(analysis.boot, "no");
  assert.deepEqual(analysis.unchecked, ["Porter-triX lr8"]);
});

test("a missing part means no boot and zero supply for its resources", () => {
  const parts = rig(...STARTER);
  delete parts.GPU;
  const analysis = analyzeLoadout(parts, [program("Cypher+ v1.4")]);
  assert.equal(analysis.boot, "no");
  assert.deepEqual(analysis.missing, ["GPU"]);
  assert.deepEqual(byKey(analysis).gpuPower, [0.44, 0, false]);
  assert.equal(analysis.power.draw, 0.6);
});

test("one program alone needs its required value, as the game shows for Cypher+ v1.4", () => {
  const analysis = analyzeLoadout(rig(...STARTER), [program("Cypher+ v1.4")]);
  assert.deepEqual(
    analysis.resources.map((r) => r.demand),
    [5, 2, 0.44, 0.2, 0.4, 2.5],
  );
});

test("PSU draw is CPU plus GPU draw even with no program", () => {
  const analysis = analyzeLoadout(rig("M-Mate J12-40", "Force Recon 13D", "Emerald H2S9", "1Y Series 1550 2kW"));
  assert.deepEqual(analysis.power, { draw: 2.2, output: 2, headroom: -0.2, fits: false });
});

test("a resource used exactly to its limit still boots: 5CRYPt0L 0J on the 6-core UNO 6.651", () => {
  const analysis = analyzeLoadout(rig("UNO 6.651", "Force Recon 13D", "Emerald H2S9", "Quartz 28-BR"), [program("5CRYPt0L 0J")]);
  assert.deepEqual(byKey(analysis), {
    cpuFrequency: [6.5, 12.7, true],
    cpuCores: [6, 6, true],
    gpuPower: [0.95, 1.03, true],
    gpuMemory: [1, 1.5, true],
    ramFrequency: [0.6, 0.77, true],
    ramMemory: [0.8, 4, true],
  });
  assert.deepEqual(analysis.power, { draw: 2.4, output: 2.8, headroom: 0.4, fits: true });
  assert.equal(analysis.boot, "yes");
  assert.equal(analysis.price, 173870);
});

test("combineDemand adds the bases and the largest uplift", () => {
  assert.equal(combineDemand([]), 0);
  assert.equal(combineDemand([{ base: 1, min: 2, max: 6 }]), 2);
  assert.equal(combineDemand([{ base: 1, min: 2, max: 6 }, { base: 2, min: 6, max: 16 }]), 7);
});

test("demand adds every base and only the largest uplift above base", () => {
  const software = [program("Screener Pro r10"), program("L8K TRG 02")];
  assert.equal(demandFor(software, "cpuCores"), 5);
  assert.equal(demandFor(software, "ramMemory"), 5.4);
  assert.equal(demandFor(software, "cpuFrequency"), 5.8);
  assert.equal(demandFor([], "cpuCores"), 0);
  assert.equal(demandFor([program("Cypher+ v1.4"), program("A/Bver 410")], "gpuMemory"), 0.8);
});

test("item lookup ignores case and extra spaces", () => {
  assert.equal(findItem(SOFTWARE, "  h0pp3r   CED/P 03 ").name, "H0pp3R ced/p 03");
  assert.equal(findItem(HARDWARE, "Nope"), undefined);
});

test("the catalog holds 19 parts and 13 programs, and only Porter-triX lr8 lacks consumption", () => {
  const count = (category) => HARDWARE.filter((item) => item.category === category).length;
  assert.deepEqual([count("CPU"), count("GPU"), count("RAM"), count("PSU")], [6, 4, 5, 4]);
  assert.equal(SOFTWARE.length, 13);
  assert.deepEqual(SOFTWARE.filter((item) => !item.consumption).map((item) => item.name), ["Porter-triX lr8"]);
  assert.equal(new Set([...HARDWARE, ...SOFTWARE].map((item) => item.name)).size, 32);
});
