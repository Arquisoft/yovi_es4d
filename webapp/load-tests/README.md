# Gatling load tests

This folder contains Gatling simulations for the web application.

## Prerequisites

- Docker running locally
- Webapp running (for example with `npm run dev`)

## Run the smoke test

From `webapp/`:

```bash
npm run loadtest
```

The simulation uses `http://host.docker.internal:5173` by default.

## Configure test parameters

Use environment variables and Java system properties to customize execution:

- `BASE_URL` (env var): target base URL
- `users` (Java property): total virtual users (default `25`)
- `rampSeconds` (Java property): ramp-up duration in seconds (default `30`)

PowerShell example:

```powershell
$env:BASE_URL = "http://host.docker.internal:5173"
docker run --rm -v "${pwd}/load-tests:/opt/gatling/user-files" -v "${pwd}/load-tests/results:/opt/gatling/results" denvazh/gatling:latest -s simulations.WebAppSmokeSimulation -Dusers=100 -DrampSeconds=60
```

Results are stored in `load-tests/results/`.
