---
name: coregg-solver
description: Next move for the Cor3.gg cleaner-bot protocol minigame (Version/Method/Channel/Cipher, "Mismatched n" feedback). Use when the user plays that minigame or reports a mismatch count.
---

Run `node scripts/next-move.mjs` with one argument per attempt so far, each `"<Version> <Method> <Channel> <Cipher>=<mismatched>"`. The script path is relative to this skill's directory.

Example: `node scripts/next-move.mjs "v1.0 GET LTE AES=2"`.

Tell the user the `move` field. With no arguments the script prints the opening move.

Values: Version `v1.0|v1.1|v2.0`, Method `GET|PUT|POST`, Channel `LTE|Fiber|Sat`, Cipher `AES|RSA|DES`. The game allows four attempts. The script exits non-zero with a message on an unknown value, a bad mismatch count, more than four attempts, or an attempt list that leaves no possible target.

The JSON output has `solved`, `triesLeft`, `candidates` (possible targets left), `move`, `hits` (targets the move still solves within the tries left) and, when 8 or fewer targets remain, `possibleTargets`.
