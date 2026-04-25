# Gatling load tests

This folder contains Gatling simulations for the web application.

## Prerequisites

- Docker running locally
- Webapp stack running (gateway reachable)

## Run available simulations

From `webapp/`:

```bash
# Smoke (health + bot-modes)
npm run loadtest

# Load ModeSelector (bot-modes)
npm run loadtest:mode-selector

# Load GameBoard (register/login + select + start + play + end)
npm run loadtest:gameboard

# Load Friends (register/login + explore + friend request + notifications)
npm run loadtest:friends:auto

# Auto-detect BASE_URL (http vs https) and run GameBoard
npm run loadtest:gameboard:auto

# GameBoard with auto-token helper (login done outside Gatling)
npm run loadtest:gameboard:auto-token
```

Gateway-based simulations use `http://host.docker.internal:8000` by default.

Note: `BASE_URL` must match the gateway mode. If the gateway runs with `GATEWAY_HTTPS=true`, use `https://...`.
When using `https://...`, the simulations accept self-signed certificates automatically (see `load-tests/conf/gatling.conf`).
If you're unsure which scheme is active, use the `*:auto` npm scripts that probe `/health` and pick the right `BASE_URL` automatically.

## Configure test parameters

Use environment variables and Java system properties to customize execution:

- `BASE_URL` (env var): target base URL
- `users` (Java property): total virtual users (default `25`)
- `rampSeconds` (Java property): ramp-up duration in seconds (default `30`)
- `maxDurationSeconds` (Java property): max test duration in seconds
- `repeatsPerUser` (Java property, ModeSelector simulation): number of `/bot-modes` reads per virtual user
- `LOADTEST_USER_EMAIL` (env var, GameBoard simulation): optional existing user email (skips register step)
- `LOADTEST_USER_PASSWORD` (env var, GameBoard simulation): optional existing user password (skips register step)
- `BOT_MODE` (env var, GameBoard simulation): bot mode (`random_bot`, `intermediate_bot`, `hard_bot`)
- `boardSize` (Java property, GameBoard simulation): board size (`8`, `11`, `15`, `19`)
- `gamesPerUser` (Java property, GameBoard simulation): number of games per virtual user
- `movesPerGame` (Java property, GameBoard simulation): number of (validateMove + botMove) turns per game (default `2`)

GameBoard simulation always performs a login (required to play). For registration, you have two options:

- Default (recommended): the simulation registers random users (`/adduser`) and then logs in.
- Reuse an existing user: set `LOADTEST_USER_EMAIL` and `LOADTEST_USER_PASSWORD` to skip the register step and avoid growing the DB.

## Results

Results are stored in `load-tests/results/`.

Note: Gatling prints the HTML path inside the container (e.g. `/opt/gatling/results/.../index.html`).
Because we mount that folder as a volume, the report is available on your machine at:
`webapp/load-tests/results/<run-id>/index.html`.
