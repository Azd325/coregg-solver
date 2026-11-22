import { HARDWARE, SOFTWARE } from "./loadout-data.js";

export { HARDWARE, SOFTWARE };

export const CATEGORIES = ["CPU", "GPU", "RAM", "PSU"];

export const RESOURCES = [
  { key: "cpuFrequency", category: "CPU", label: "CPU frequency", unit: "GHz" },
  { key: "cpuCores", category: "CPU", label: "CPU cores", unit: "" },
  { key: "gpuPower", category: "GPU", label: "GPU power", unit: "PFLOPS" },
  { key: "gpuMemory", category: "GPU", label: "GPU memory", unit: "TB" },
  { key: "ramFrequency", category: "RAM", label: "RAM frequency", unit: "GHz" },
  { key: "ramMemory", category: "RAM", label: "RAM memory", unit: "TB" },
];

const round = (n) => Math.round(n * 1000) / 1000;
const normalize = (name) => String(name).trim().replace(/\s+/g, " ").toLowerCase();

export function findItem(items, name) {
  const wanted = normalize(name);
  return items.find((item) => normalize(item.name) === wanted);
}

export function combineDemand(ranges) {
  let base = 0;
  let uplift = 0;
  for (const range of ranges) {
    base += range.base;
    uplift = Math.max(uplift, range.min - range.base);
  }
  return base + uplift;
}

export function demandFor(software, key) {
  return round(combineDemand(software.map((item) => item.consumption?.[key]).filter(Boolean)));
}

export function analyzeLoadout(parts, software = []) {
  const missing = CATEGORIES.filter((category) => !parts[category]);
  const checked = software.filter((item) => item.consumption);
  const unchecked = software.filter((item) => !item.consumption).map((item) => item.name);

  const resources = RESOURCES.map((resource) => {
    const supply = parts[resource.category]?.[resource.key] ?? 0;
    const demand = demandFor(checked, resource.key);
    return { ...resource, supply, demand, fits: supply >= demand };
  });

  const draw = round((parts.CPU?.powerDraw ?? 0) + (parts.GPU?.powerDraw ?? 0));
  const output = parts.PSU?.powerOutput ?? 0;
  const power = { draw, output, headroom: round(output - draw), fits: output >= draw };

  const items = [...CATEGORIES.map((category) => parts[category]).filter(Boolean), ...software];
  const price = items.reduce((total, item) => total + (item.price ?? 0), 0);

  let boot = "yes";
  if (missing.length || !power.fits || resources.some((resource) => !resource.fits)) boot = "no";
  else if (unchecked.length) boot = "unknown";

  return { boot, missing, unchecked, resources, power, price };
}
