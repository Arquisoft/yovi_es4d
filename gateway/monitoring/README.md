# Monitoring (Prometheus + Grafana)

This project exposes Prometheus metrics from the gateway at `/metrics` and ships a minimal Prometheus+Grafana setup via Docker Compose.

## How to run

From the repo root:

```bash
docker compose --env-file .env.local up --build
```

Then open:

- Prometheus: `http://<host>:9090`
- Grafana: `http://<host>:9091` (anonymous admin enabled)

`<host>` is typically `localhost` (local dev) or your VM public IP (e.g. `20.188.62.231`).

## Notes

- Prometheus scrapes the gateway at `http://gateway:8000/metrics` (Docker network).
- If you run the gateway in HTTPS mode, update `gateway/monitoring/prometheus/prometheus.yml` accordingly (scheme + TLS settings).

