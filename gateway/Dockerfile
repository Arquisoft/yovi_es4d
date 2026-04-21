FROM node:22

WORKDIR /usr/src/gatewayservice

# Copiar dependencias primero (mejor cache)
COPY --chmod=444 package*.json ./

# Instalar dependencias reproducibles
RUN npm ci --omit=dev --ignore-scripts

# Copiar código con ownership correcto
COPY --chown=root:root --chmod=444 gateway-service.js openapi.yaml ./
COPY --chown=root:root --chmod=555 monitoring ./monitoring

RUN find /usr/src/gatewayservice/monitoring -type f -exec chmod 444 {} \; \
 && find /usr/src/gatewayservice/monitoring -type d -exec chmod 555 {} \;

# Cambiar a usuario no root
USER node

CMD ["node", "gateway-service.js"]
