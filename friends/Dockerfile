FROM node:22

WORKDIR /usr/src/friends

# Copiar dependencias
COPY --chmod=444 package*.json ./
RUN npm ci --omit=dev --ignore-scripts

# Copiar código con usuario correcto
COPY --chown=node:node --chmod=444 friend-service.js conection.js ./
COPY --chown=node:node --chmod=555 middlewares ./middlewares
COPY --chown=node:node --chmod=555 models ./models

# Crear logs antes de bajar privilegios
RUN mkdir -p /usr/src/friends/logs \
    && find /usr/src/friends/middlewares -type f -exec chmod 444 {} \; \
    && find /usr/src/friends/middlewares -type d -exec chmod 555 {} \; \
    && find /usr/src/friends/models -type f -exec chmod 444 {} \; \
    && find /usr/src/friends/models -type d -exec chmod 555 {} \; \
    && chown -R node:node /usr/src/friends/logs \
    && chmod 755 /usr/src/friends/logs

# Cambiar a usuario no root
USER node

EXPOSE 8004

CMD ["node", "friend-service.js"]
