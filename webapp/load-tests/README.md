# Gatling load tests

This folder contains Gatling simulations for the web application.

## Prerequisites

- Docker running locally
- Webapp running (for example with `npm run dev`)

## Run available simulations

From `webapp/`:

```bash
# Flujo básico del gateway
npm run loadtest

# Carga de ModeSelector (bot-modes)
npm run loadtest:mode-selector

# Carga de GameBoard (login + start + move)
npm run loadtest:gameboard

# Carga de GameBoard con token automático (login previo)
npm run loadtest:gameboard:auto-token
```

Gateway-based simulations use `http://host.docker.internal:8000` by default.

## Configure test parameters

Use environment variables and Java system properties to customize execution:

- `BASE_URL` (env var): target base URL
- `users` (Java property): total virtual users (default `25`)
- `rampSeconds` (Java property): ramp-up duration in seconds (default `30`)
- `maxDurationSeconds` (Java property): max test duration in seconds
- `repeatsPerUser` (Java property, ModeSelector simulation): number of `/bot-modes` reads per virtual user
- `LOADTEST_USER_EMAIL` (env var, GameBoard simulation): authenticated user email
- `LOADTEST_USER_PASSWORD` (env var, GameBoard simulation): authenticated user password
- `LOADTEST_AUTH_TOKEN` (env var, GameBoard simulation): optional JWT token only used by helper scripts
- `BOT_MODE` (env var, GameBoard simulation): bot mode (`random_bot`, `intermediate_bot`, `hard_bot`)
- `boardSize` (Java property, GameBoard simulation): board size (`8`, `11`, `15`, `19`)
- `gamesPerUser` (Java property, GameBoard simulation): number of start/validate/move cycles per virtual user

Important: when running through the npm scripts, these env vars are forwarded to the Gatling Docker container (`-e ...` in `package.json` scripts).

For `loadtest:gameboard:auto-token`, set:
- `LOADTEST_USER_EMAIL`
- `LOADTEST_USER_PASSWORD`
- optional `BASE_URL` (used for both login and Gatling target)

PowerShell example:

```powershell
$env:BASE_URL = "http://host.docker.internal:5173"
docker run --rm -v "${pwd}/load-tests:/opt/gatling/user-files" -v "${pwd}/load-tests/results:/opt/gatling/results" denvazh/gatling:latest -s simulations.WebAppSmokeSimulation -Dusers=100 -DrampSeconds=60
```

GameBoard example (PowerShell):

```powershell
$env:BASE_URL = "http://host.docker.internal:8000"
$env:LOADTEST_USER_EMAIL = "tu_usuario@correo.com"
$env:LOADTEST_USER_PASSWORD = "tu_password"
$env:BOT_MODE = "random_bot"
docker run --rm -e BASE_URL -e BOT_MODE -e LOADTEST_USER_EMAIL -e LOADTEST_USER_PASSWORD -v "${pwd}/load-tests:/opt/gatling/user-files" -v "${pwd}/load-tests/results:/opt/gatling/results" denvazh/gatling:latest -s simulations.GameBoardLoadSimulation -Dusers=10 -DrampSeconds=60 -DboardSize=11 -DgamesPerUser=2
```

Results are stored in `load-tests/results/`.
