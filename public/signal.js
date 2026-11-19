const ENCODINGS = [
  {
    name: "Morse",
    size: 5,
    digits: { LLLLL: "0", SLLLL: "1", SSLLL: "2", SSSLL: "3", SSSSL: "4", SSSSS: "5", LSSSS: "6", LLSSS: "7", LLLSS: "8", LLLLS: "9" },
  },
  {
    name: "Binary",
    size: 4,
    digits: { SSSS: "0", SSSL: "1", SSLS: "2", SSLL: "3", SLSS: "4", SLSL: "5", SLLS: "6", SLLL: "7", LSSS: "8", LSSL: "9" },
  },
];
const BINARY_ONLY_LENGTH = 40;

function readGroups(pulses, { size, digits }) {
  if (pulses.length % size !== 0) return null;
  let code = "";
  for (let i = 0; i < pulses.length; i += size) {
    const digit = digits[pulses.slice(i, i + size)];
    if (digit === undefined) return null;
    code += digit;
  }
  return code;
}

export function decodeSignal(text) {
  const pulses = String(text).replace(/\s+/g, "").toUpperCase();
  const invalid = [...new Set(pulses.replace(/[SL]/g, ""))];
  if (pulses === "") return { status: "empty", pulses, readings: [] };
  if (invalid.length) return { status: "invalid", pulses, invalid, readings: [] };
  const readings = ENCODINGS.flatMap((encoding) => {
    const code = readGroups(pulses, encoding);
    return code === null ? [] : [{ encoding: encoding.name, code }];
  });
  if (readings.length < 2) return { status: readings.length ? "single" : "none", pulses, readings };
  if (pulses.length === BINARY_ONLY_LENGTH) return { status: "binary-rule", pulses, readings: readings.filter((r) => r.encoding === "Binary") };
  return { status: "undecided", pulses, readings };
}
