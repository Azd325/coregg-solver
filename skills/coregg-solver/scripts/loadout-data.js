export const HARDWARE = [
  { category: "CPU", name: "M-Mate J12-40", manufacturer: "GOI", tier: 1, price: null, market: null, reputation: null, vulnerability: 0, cpuFrequency: 7.2, cpuCores: 8, powerDraw: 0.6 },
  { category: "CPU", name: "UNO 6.651", manufacturer: "Holoscene Interactive", tier: 1, price: 14490, market: "CORE", reputation: 2, vulnerability: 10, cpuFrequency: 12.7, cpuCores: 6, powerDraw: 0.8 },
  { category: "CPU", name: "Hex Lattice 14+", manufacturer: "ViiBot", tier: 2, price: 28340, market: "BMI-ZEN", reputation: 2, vulnerability: 30, cpuFrequency: 14.6, cpuCores: 6, powerDraw: 1.25 },
  { category: "CPU", name: "I-Partner C16-10", manufacturer: "GOI", tier: 3, price: 52560, market: "SOYUZ RM7", reputation: 2, vulnerability: 18, cpuFrequency: 16.4, cpuCores: 4, powerDraw: 1.4 },
  { category: "CPU", name: "8Pro Series 1870", manufacturer: "ViiBot", tier: 2, price: 61320, market: "USOL RM7", reputation: 2, vulnerability: 20, cpuFrequency: 13.5, cpuCores: 8, powerDraw: 1.3 },
  { category: "CPU", name: "OmniFlow 12.35X", manufacturer: "Holoscene Electronics", tier: 5, price: 83835, market: "CORE", reputation: 5, vulnerability: 8, cpuFrequency: 13.1, cpuCores: 12, powerDraw: 1.5 },
  { category: "GPU", name: "OmniPix 23.2", manufacturer: "Holoscene Interactive", tier: 1, price: null, market: null, reputation: null, vulnerability: 0, gpuPower: 0.88, gpuMemory: 1, powerDraw: 1.2 },
  { category: "GPU", name: "Force Recon 13D", manufacturer: "TaiForce", tier: 1, price: 30935, market: "CORE", reputation: 3, vulnerability: 8, gpuPower: 1.03, gpuMemory: 1.5, powerDraw: 1.6 },
  { category: "GPU", name: "Force Industry 22C", manufacturer: "TaiForce", tier: 2, price: 59400, market: "USOL RM7", reputation: 2, vulnerability: 12, gpuPower: 1.13, gpuMemory: 2.4, powerDraw: 2.15 },
  { category: "GPU", name: "SupraPix 41.0", manufacturer: "Holoscene Interactive", tier: 2, price: 82420, market: "BMI-ZEN", reputation: 5, vulnerability: 32, gpuPower: 1.24, gpuMemory: 1.8, powerDraw: 1.8 },
  { category: "RAM", name: "Emerald H2S9", manufacturer: "XHI", tier: 1, price: null, market: null, reputation: null, vulnerability: 0, ramFrequency: 0.77, ramMemory: 4 },
  { category: "RAM", name: "Emerald H3S12", manufacturer: "XHI", tier: 1, price: 11385, market: "CORE", reputation: 2, vulnerability: 10, ramFrequency: 0.98, ramMemory: 6 },
  { category: "RAM", name: "X-Vault 6-54 Spec", manufacturer: "GOI", tier: 2, price: 32435, market: "BMI-ZEN", reputation: 2, vulnerability: 25, ramFrequency: 1.29, ramMemory: 8 },
  { category: "RAM", name: "C-Stack 10.8", manufacturer: "Holoscene Electronics", tier: 3, price: 67680, market: "SOYUZ RM7", reputation: 3, vulnerability: 15, ramFrequency: 1.46, ramMemory: 10 },
  { category: "RAM", name: "Hepta gen19 Binary", manufacturer: "Core Tech", tier: 3, price: 71040, market: "USOL RM7", reputation: 3, vulnerability: 18, ramFrequency: 1.21, ramMemory: 14 },
  { category: "PSU", name: "1Y Series 1550 2kW", manufacturer: "ViiBot", tier: 1, price: null, market: null, reputation: null, vulnerability: 0, powerOutput: 2, protection: 5 },
  { category: "PSU", name: "Quartz 28-BR", manufacturer: "Core Tech", tier: 1, price: 19895, market: "CORE", reputation: 3, vulnerability: 5, powerOutput: 2.8, protection: 15 },
  { category: "PSU", name: "IP-Feichang K3S6", manufacturer: "XHI", tier: 3, price: 46200, market: "SOYUZ RM7", reputation: 1, vulnerability: 5, powerOutput: 3, protection: 45 },
  { category: "PSU", name: "Obelisk-8 3500", manufacturer: "Baresea Technologies", tier: 2, price: 52260, market: "BMI-ZEN", reputation: 5, vulnerability: 25, powerOutput: 3.5, protection: 5 },
];

export const SOFTWARE = [
  {
    name: "Cypher+ v1.4", manufacturer: "CORIE", tier: 1, price: 6440, market: "CORE", reputation: 1,
    abilities: [
      { type: "DECRYPT", power: [8, 25], files: [".eb52x", ".ab52p"], remote: false },
    ],
    consumption: {
      cpuFrequency: { base: 0, min: 5, max: 14.4 },
      cpuCores: { base: 1, min: 2, max: 6 },
      gpuPower: { base: 0.06, min: 0.44, max: 0.88 },
      gpuMemory: { base: 0.1, min: 0.2, max: 0.34 },
      ramFrequency: { base: 0, min: 0.4, max: 1.2 },
      ramMemory: { base: 1.3, min: 2.5, max: 6 },
    },
  },
  {
    name: "Seeker-IV v0.6", manufacturer: "CORIE", tier: 1, price: 10580, market: "CORE", reputation: 1,
    abilities: [
      { type: "SEARCH", power: [4, 18], servers: ["CEDRT public", "CEDRT private"] },
    ],
    consumption: {
      cpuFrequency: { base: 0, min: 1.6, max: 2.97 },
      cpuCores: { base: 1, min: 1, max: 2 },
      gpuPower: { base: 0, min: 0.01, max: 0.13 },
      gpuMemory: { base: 0.26, min: 0.4, max: 0.8 },
      ramFrequency: { base: 0, min: 0.52, max: 1.19 },
      ramMemory: { base: 1.2, min: 2.9, max: 8 },
    },
  },
  {
    name: "Porter-lite r4", manufacturer: "GridWorks", tier: 1, price: 13225, market: "CORE", reputation: 2,
    abilities: [
      { type: "HACK", power: [6, 17], servers: ["CEDRT public", "CEDRT private"] },
    ],
    consumption: {
      cpuFrequency: { base: 0, min: 5.8, max: 11.9 },
      cpuCores: { base: 1, min: 2, max: 2 },
      gpuPower: { base: 0.45, min: 0.55, max: 1.1 },
      gpuMemory: { base: 0.3, min: 0.7, max: 1.02 },
      ramFrequency: { base: 0, min: 0.36, max: 0.8 },
      ramMemory: { base: 0.8, min: 1, max: 1.7 },
    },
  },
  {
    name: "RE-nova v3.0", manufacturer: "CORIE", tier: 2, price: 15755, market: "CORE", reputation: 2,
    abilities: [
      { type: "HACK", power: [10, 35], servers: ["EMERMODE"] },
      { type: "SEARCH", power: [5, 28], servers: ["EMERMODE"] },
    ],
    consumption: {
      cpuFrequency: { base: 0, min: 11.2, max: 14.8 },
      cpuCores: { base: 1, min: 2, max: 4 },
      gpuPower: { base: 0.4, min: 0.85, max: 1.19 },
      gpuMemory: { base: 0.15, min: 0.4, max: 0.85 },
      ramFrequency: { base: 0, min: 0.55, max: 1.1 },
      ramMemory: { base: 2.2, min: 4.3, max: 5.5 },
    },
  },
  {
    name: "L8K TRG 02", manufacturer: "mr.droid", tier: 2, price: 23790, market: "BMI-ZEN", reputation: 1,
    abilities: [
      { type: "SEARCH", power: [7, 28], servers: ["CEDRT public", "CEDRT private", "D4RK T4", "D4RK 2IV", "SOYUZ public", "USOL public", "USOL private"] },
    ],
    consumption: {
      cpuFrequency: { base: 0, min: 1.2, max: 2.65 },
      cpuCores: { base: 1, min: 4, max: 6 },
      gpuPower: { base: 0, min: 0.022, max: 0.35 },
      gpuMemory: { base: 0.57, min: 1.17, max: 1.9 },
      ramFrequency: { base: 0, min: 0.62, max: 1.32 },
      ramMemory: { base: 1.2, min: 3.2, max: 10 },
    },
  },
  {
    name: "D-Badger v2.2", manufacturer: "CORIE", tier: 4, price: 28290, market: "CORE", reputation: 4,
    abilities: [
      { type: "HACK", power: [5, 43], servers: ["D4RK/B1N"] },
    ],
    consumption: {
      cpuFrequency: { base: 0, min: 7.9, max: 14.5 },
      cpuCores: { base: 1, min: 2, max: 6 },
      gpuPower: { base: 0.14, min: 0.72, max: 1.35 },
      gpuMemory: { base: 0.2, min: 0.83, max: 1.85 },
      ramFrequency: { base: 0, min: 0.48, max: 1.4 },
      ramMemory: { base: 0.35, min: 1.22, max: 4.5 },
    },
  },
  {
    name: "Screener Pro r10", manufacturer: "GridWorks", tier: 1, price: 41160, market: "USOL RM7", reputation: 1,
    abilities: [
      { type: "SEARCH", power: [18, 36], servers: ["CEDRT public", "CEDRT private", "D4RK/B1N"] },
    ],
    consumption: {
      cpuFrequency: { base: 0, min: 5.8, max: 11.5 },
      cpuCores: { base: 1, min: 4, max: 8 },
      gpuPower: { base: 0.12, min: 0.35, max: 0.85 },
      gpuMemory: { base: 0.6, min: 1.02, max: 2.05 },
      ramFrequency: { base: 0, min: 0.85, max: 1.19 },
      ramMemory: { base: 1.2, min: 4.2, max: 11.9 },
    },
  },
  {
    name: "5CRYPt0L 09", manufacturer: "mr.droid", tier: 2, price: 42250, market: "BMI-ZEN", reputation: 3,
    abilities: [
      { type: "DECRYPT", power: [14, 38], files: [".eb52x", ".ab52p", ".eb54x"], remote: false },
    ],
    consumption: {
      cpuFrequency: { base: 0, min: 6.7, max: 14 },
      cpuCores: { base: 1, min: 1, max: 1 },
      gpuPower: { base: 0.05, min: 0.12, max: 0.35 },
      gpuMemory: { base: 0.07, min: 0.15, max: 0.15 },
      ramFrequency: { base: 0, min: 0.55, max: 1.19 },
      ramMemory: { base: 3.2, min: 4.6, max: 7.9 },
    },
  },
  {
    name: "A/Bver 410", manufacturer: "VolgaSoft", tier: 3, price: 44640, market: "SOYUZ RM7", reputation: 2,
    abilities: [
      { type: "HACK", power: [12, 26], servers: ["SOYUZ public"] },
      { type: "SEARCH", power: [6, 22], servers: ["SOYUZ public"] },
    ],
    consumption: {
      cpuFrequency: { base: 0, min: 12.1, max: 16 },
      cpuCores: { base: 1, min: 1, max: 1 },
      gpuPower: { base: 0.4, min: 0.85, max: 1.19 },
      gpuMemory: { base: 0.35, min: 0.7, max: 1.35 },
      ramFrequency: { base: 0, min: 0.79, max: 1.42 },
      ramMemory: { base: 0.8, min: 2, max: 4.8 },
    },
  },
  {
    name: "Porter-triX lr8", manufacturer: "GridWorks", tier: 3, price: 74760, market: "USOL RM7", reputation: 3,
    abilities: [
      { type: "HACK", power: [12, 25], servers: ["CEDRT private", "USOL public", "USOL private", "D4RK T4"] },
    ],
    consumption: null,
  },
  {
    name: "Lyapun AA8", manufacturer: "VolgaSoft", tier: 3, price: 82560, market: "SOYUZ RM7", reputation: 3,
    abilities: [
      { type: "DECRYPT", power: [20, 35], files: [".eb54x", ".12vvsh", ".xvct"], remote: false },
    ],
    consumption: {
      cpuFrequency: { base: 0, min: 12.5, max: 16.8 },
      cpuCores: { base: 1, min: 1, max: 1 },
      gpuPower: { base: 0.1, min: 0.22, max: 0.49 },
      gpuMemory: { base: 0.12, min: 0.19, max: 0.54 },
      ramFrequency: { base: 0, min: 0.95, max: 1.4 },
      ramMemory: { base: 1.85, min: 5.2, max: 9.85 },
    },
  },
  {
    name: "H0pp3R ced/p 03", manufacturer: "mr.droid", tier: 3, price: 97890, market: "BMI-ZEN", reputation: 4,
    abilities: [
      { type: "HACK", power: [12, 26], servers: ["CEDRT public"] },
      { type: "SEARCH", power: [2, 12], servers: ["CEDRT public"] },
      { type: "DECRYPT", power: [15, 32], files: [".eb52x", ".ab52p"], remote: false },
    ],
    consumption: {
      cpuFrequency: { base: 0, min: 11.5, max: 14.9 },
      cpuCores: { base: 2, min: 2, max: 8 },
      gpuPower: { base: 0.6, min: 0.83, max: 1.22 },
      gpuMemory: { base: 0.8, min: 0.95, max: 1.79 },
      ramFrequency: { base: 0, min: 0.86, max: 1.32 },
      ramMemory: { base: 2.8, min: 4, max: 8.2 },
    },
  },
  {
    name: "5CRYPt0L 0J", manufacturer: "mr.droid", tier: 3, price: 108550, market: "BMI-ZEN", reputation: 3,
    abilities: [
      { type: "DECRYPT", power: [14, 46], files: [".eb54x", ".jjqv"], remote: false },
    ],
    consumption: {
      cpuFrequency: { base: 0, min: 6.5, max: 14.6 },
      cpuCores: { base: 2, min: 6, max: 16 },
      gpuPower: { base: 0.25, min: 0.95, max: 1.52 },
      gpuMemory: { base: 0.4, min: 1, max: 2 },
      ramFrequency: { base: 0, min: 0.6, max: 0.9 },
      ramMemory: { base: 0.55, min: 0.8, max: 3.8 },
    },
  },
];
