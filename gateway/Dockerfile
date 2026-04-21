FROM node:22

WORKDIR /usr/src/gatewayservice

# Copiar dependencias primero (mejor cache)
COPY package*.json ./

# Instalar dependencias reproducibles
RUN npm ci --omit=dev --ignore-scripts

# Copiar código con ownership correcto
COPY --chown=node:node . .

# Cambiar a usuario no root
USER node

CMD ["node", "gateway-service.js"]