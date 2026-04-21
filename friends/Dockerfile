FROM node:22

WORKDIR /usr/src/friends

# Copiar dependencias
COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts

# Copiar código con usuario correcto
COPY --chown=node:node . .

# Crear logs antes de bajar privilegios
RUN mkdir -p /usr/src/friends/logs \
    && chown -R node:node /usr/src/friends/logs \
    && chmod 755 /usr/src/friends/logs

# Cambiar a usuario no root
USER node

EXPOSE 8004

CMD ["node", "friend-service.js"]