# coregg-solver

[![CI](https://img.shields.io/github/actions/workflow/status/Azd325/coregg-solver/test.yml?branch=main)](https://github.com/Azd325/coregg-solver/actions/workflows/test.yml) [![License: MIT](https://img.shields.io/badge/license-MIT-green)](LICENSE) [![Live site](https://img.shields.io/website?url=https%3A%2F%2Fcor3.azd325.com&label=cor3.azd325.com)](https://cor3.azd325.com)

Next-move solver for the Cor3.gg cleaner-bot protocol minigame. Use it at https://cor3.azd325.com.

This is an unofficial fan tool. It is not affiliated with the game or its makers.

## What it does

The minigame hides one combination of four fields:

| Field | Values |
|---|---|
| Version | `v1.0`, `v1.1`, `v2.0` |
| Method | `GET`, `PUT`, `POST` |
| Channel | `LTE`, `Fiber`, `Sat` |
| Cipher | `AES`, `RSA`, `DES` |

That gives 81 combinations. The game gives four or six attempts, depending on the mode. After each attempt the game reports how many fields are mismatched.

Keep the solver open next to the game:

1. Set **attempts left** (the − and + buttons) to what the game shows. The solver starts at six. Keep it in step with the game: it plans the search for that many attempts.
2. Set the four fields in the game to the move the solver shows. The fields to change since the last attempt are lit.
3. Press the reported `Mismatched` number (`0`–`4`) on the keyboard, or tap it. The solver logs the attempt and shows the next move at once.
4. `0` means a hit. Press `U` to undo a wrong entry and `N` to start a new round.

To take over a round that is already running, or to try a move of your own, open **Log a different move**. Pick the four fields, then tap the mismatch count. Set attempts left to what the game shows when you join a round that is already running. If an entry leaves no possible target, the solver shows a conflict and keeps the last valid state.

## How it picks a move

For each possible next move, the solver groups the remaining targets by the mismatch count that move would produce. It then counts, recursively, how many targets it can still hit within the attempts left. It plays the move with the highest count. On a tie it prefers a move that can still be the target. A move that cannot be the target can still be the best probe. With four attempts the solver cannot reach every target: the best opening move solves 55 of 81. With five or six attempts it solves all 81.

The search for the four-attempt opening move takes about half a second, so that opening move is precomputed. A test recomputes it. Other limits are searched on demand.

## Use it from an agent

Install the skill with `npx skills add Azd325/coregg-solver`. Your agent then runs the solver locally and tells you the next move. The script takes `--attempts-left N` (default: a four-attempt game).

## Run locally

The app is static HTML, CSS and JavaScript in `public/`. It has no build step and no dependencies. The fonts are self-hosted in `public/fonts/` under the SIL Open Font License.

```sh
npx wrangler dev   # serves public/ as a Cloudflare Worker with static assets
npm ci             # installs the test dependency (jsdom)
npm test           # runs the tests with Node's built-in test runner
```

## License

MIT. See [LICENSE](LICENSE).
