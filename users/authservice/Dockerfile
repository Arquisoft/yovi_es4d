FROM node:22

WORKDIR /usr/src/authservice

# Copiar dependencias primero (mejor caché)
COPY --chmod=444 package*.json ./

# bcrypt puede requerir compilación: instalamos toolchain solo durante el build
RUN apt-get update \
 && apt-get install -y --no-install-recommends python3 make g++ \
 && npm ci --omit=dev \
 && apt-get purge -y --auto-remove python3 make g++ \
 && rm -rf /var/lib/apt/lists/*

# Copiar código de runtime
COPY --chown=root:root --chmod=444 auth-service.js auth-model.js ./

# Ajustar ownership (ejecutamos como usuario no root)
RUN chown -R node:node /usr/src/authservice

USER node

EXPOSE 8002

CMD ["node", "auth-service.js"]
