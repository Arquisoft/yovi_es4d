#!/bin/sh
set -eu

CERT_DIR="/etc/nginx/certs"
CERT_KEY="${CERT_DIR}/localhost.key"
CERT_CRT="${CERT_DIR}/localhost.crt"

# Public IP/hostname for the VM (optional). When provided, we include it in the
# certificate Subject Alternative Names so browsers don't reject it for CN/SAN mismatch.
PUBLIC_IP="${WEBAPP_PUBLIC_IP:-}"

DEFAULT_SAN="DNS:localhost,IP:127.0.0.1"
if [ -n "${PUBLIC_IP}" ]; then
  SAN="${DEFAULT_SAN},IP:${PUBLIC_IP}"
else
  SAN="${DEFAULT_SAN}"
fi

if [ ! -f "${CERT_KEY}" ] || [ ! -f "${CERT_CRT}" ]; then
  mkdir -p "${CERT_DIR}"

  # OpenSSL 3 supports -addext. If it's not available, fall back to a basic cert.
  if ! openssl req -x509 -nodes -newkey rsa:2048 \
    -keyout "${CERT_KEY}" \
    -out "${CERT_CRT}" \
    -days 3650 \
    -subj "/CN=localhost" \
    -addext "subjectAltName=${SAN}" \
    >/dev/null 2>&1; then
    openssl req -x509 -nodes -newkey rsa:2048 \
      -keyout "${CERT_KEY}" \
      -out "${CERT_CRT}" \
      -days 3650 \
      -subj "/CN=localhost" \
      >/dev/null 2>&1
  fi
fi

exec nginx -g "daemon off;"

