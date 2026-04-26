# Monitoring (Prometheus + Grafana)

This project exposes Prometheus metrics from the gateway at `/metrics` and ships a minimal Prometheus+Grafana setup via Docker Compose.

## How to run

From the repo root:

```bash
docker compose --env-file .env.local up --build
```

Then open:

- Prometheus (direct): `http://localhost:9090/prometheus/`
- Grafana (direct): `http://localhost:9091/grafana/` (anonymous admin enabled)
- Prometheus (via webapp HTTPS): `https://<host>/prometheus/`
- Grafana (via webapp HTTPS): `https://<host>/grafana/`

## Notes

- Prometheus scrapes the gateway at `http://gateway:8000/metrics` (Docker network).
- If you run the gateway in HTTPS mode, update `gateway/monitoring/prometheus/prometheus.yml` accordingly (scheme + TLS settings).

## Deployment tip (VM)

If you only expose ports 80/443 on the VM, you can still access monitoring through the webapp reverse proxy:
`WEBAPP_EXTERNAL_URL` in `.env` controls the public base URL used by Grafana for redirects/links.

