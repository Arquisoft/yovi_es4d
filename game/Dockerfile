FROM node:18-alpine

WORKDIR /app

# Copiar manifests
COPY package*.json ./

# Instalar dependencias como root
RUN npm ci --omit=dev

# Copiar código con permisos normales
COPY --chown=node:node game-service.js gameModel.js conection.js ./

# Cambiar a usuario no root
USER node

EXPOSE 8003

CMD ["npm", "start"]
