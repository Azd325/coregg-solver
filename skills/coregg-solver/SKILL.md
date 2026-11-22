---
name: coregg-solver
description: Next move for the Cor3.gg cleaner-bot protocol minigame (Version/Method/Channel/Cipher, "Mismatched n" feedback), and a COR3 loadout checker (CPU, GPU, RAM, PSU and software: boot, resources, PSU headroom, price). Use when the user plays that minigame, reports a mismatch count, or plans or checks a COR3 loadout.
---

Run `node scripts/next-move.mjs` with one argument per attempt so far, each `"<Version> <Method> <Channel> <Cipher>=<mismatched>"`. The script path is relative to this skill's directory.

Example: `node scripts/next-move.mjs "v1.0 GET LTE AES=2"`.

The game allows four or six attempts, depending on the mode. Without a flag the script assumes six. Pass `--attempts-left N` with the attempts the game still shows (4 before the first attempt of a four-attempt mode), for example `node scripts/next-move.mjs "v1.0 GET LTE AES=2" --attempts-left 5`. Ask the user how many attempts the game gives if you do not know.

Tell the user the `move` field. With no arguments the script prints the opening move.

Values: Version `v1.0|v1.1|v2.0`, Method `GET|PUT|POST`, Channel `LTE|Fiber|Sat`, Cipher `AES|RSA|DES`. The script exits non-zero with a message on an unknown value, a bad mismatch count, a bad `--attempts-left`, more attempts than the limit allows, a total of more than eight attempts, or an attempt list that leaves no possible target.

The JSON output has `solved`, `triesLeft`, `candidates` (possible targets left), `move`, `hits` (targets the move still solves within the tries left) and, when 8 or fewer targets remain, `possibleTargets`.

## Loadout checker

Run `node scripts/loadout.mjs` to see every part and program with its specs and price. Then check a loadout:

`node scripts/loadout.mjs check --cpu "UNO 6.651" --gpu "OmniPix 23.2" --ram "Emerald H3S12" --psu "Quartz 28-BR" --software "Cypher+ v1.4" --software "Seeker-IV v0.6"`

Repeat `--software` once per program. Names ignore case. `node scripts/loadout.mjs view "<name>"` prints every fact about one item, and `<command> --help` prints the flags.

The output is TOON text: `boot` (`yes`, `no` or `unknown`), `reason`, a `resources` table (demand, supply, fits), `power` (draw, output, headroom in kW) and `price` (credits). `boot: unknown` means every checked number fits, but a program in the `unchecked` list has no consumption data. Tell the user the verdict, the reason and the price. Errors print on stdout with exit code 1 (an unknown name, with the valid names listed) or 2 (a bad flag or command).
