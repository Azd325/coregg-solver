const TYPES = ["AUTH", "TEMP-SYNC", "SCAN", "ROUTE-CHECK", "RADIO-TEST", "PING", "SYNC"];
const STATUSES = ["OK", "WARN", "ERROR"];
const SECTOR_RANGE = [1, 256];
const PAIR_SIZE = 2;

export const FAULT_LABELS = {
  TIME: "Time format is incorrect",
  TYPE: "Event type is incorrect",
  MISSING_SECTOR: "Missing /sector parameter",
  MISSING_STATUS: "Missing /status parameter",
  SECTOR_BAD: "/sector parameter is incorrect",
  STATUS_BAD: "/status parameter is incorrect",
};

const TIME_TOKEN = /^\[([^\]]*)\]/;
const TIME_FIELDS = /^(\d{2}):(\d{2}):(\d{2})$/;
const TIME_LIMITS = [["hour", 23], ["minute", 59], ["second", 59]];

function timeFault(line) {
  const token = line.match(TIME_TOKEN);
  if (!token) return { fault: { code: "TIME", reason: "no [HH:MM:SS]" }, rest: line };
  const rest = line.slice(token[0].length);
  const fields = token[1].match(TIME_FIELDS);
  if (!fields) return { fault: { code: "TIME", reason: `${token[0]} is not [HH:MM:SS]` }, rest };
  const bad = TIME_LIMITS.flatMap(([name, max], i) => (Number(fields[i + 1]) > max ? [`${name} ${fields[i + 1]}`] : []));
  const gap = /^\s/.test(rest) || rest === "";
  if (!gap) bad.push("no space after ]");
  return { fault: bad.length ? { code: "TIME", reason: bad.join(", ") } : null, rest };
}

function typeFault(rest) {
  const [first = ""] = rest.trim().split(/\s+/);
  if (first === "" || first.startsWith("/")) return { code: "TYPE", reason: "no type" };
  return TYPES.includes(first) ? null : { code: "TYPE", reason: first };
}

function parameter(rest, name) {
  return rest.match(new RegExp(`(?:^|\\s)/${name}=(\\S*)`))?.[1];
}

function sectorFault(value) {
  if (value === undefined) return { code: "MISSING_SECTOR", reason: "no /sector" };
  const number = /^\d+$/.test(value) ? Number(value) : NaN;
  const ok = number >= SECTOR_RANGE[0] && number <= SECTOR_RANGE[1];
  return ok ? null : { code: "SECTOR_BAD", reason: `sector ${value || "empty"}` };
}

function statusFault(value) {
  if (value === undefined) return { code: "MISSING_STATUS", reason: "no /status" };
  return STATUSES.includes(value) ? null : { code: "STATUS_BAD", reason: `status ${value || "empty"}` };
}

export function checkLine(raw) {
  const line = String(raw).trim();
  const { fault: time, rest } = timeFault(line);
  return [time, typeFault(rest), sectorFault(parameter(rest, "sector")), statusFault(parameter(rest, "status"))]
    .filter(Boolean)
    .map((fault) => ({ ...fault, label: FAULT_LABELS[fault.code] }));
}

export function checkLog(text) {
  const lines = String(text)
    .split(/\r\n|\r|\n/)
    .map((raw, i) => ({ number: i + 1, text: raw.trim() }))
    .filter((line) => line.text !== "")
    .map((line) => ({ ...line, faults: checkLine(line.text), pick: false }));
  const worst = lines.filter((line) => line.faults.length).sort((a, b) => b.faults.length - a.faults.length);
  for (const line of worst.slice(0, PAIR_SIZE)) line.pick = true;
  return lines;
}
