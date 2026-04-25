# Monitoring (Prometheus + Grafana)

This project exposes Prometheus metrics from the gateway at `/metrics` and ships a minimal Prometheus+Grafana setup via Docker Compose.

## How to run

From the repo root:

```bash
docker compose --env-file .env.local up --build
```

Then open:

- Prometheus: `http://localhost:9090`
- Grafana: `http://localhost:9091` (anonymous admin enabled)

## Notes

- Prometheus scrapes the gateway at `http://gateway:8000/metrics` (Docker network).
- If you run the gateway in HTTPS mode, update `gateway/monitoring/prometheus/prometheus.yml` accordingly (scheme + TLS settings).

