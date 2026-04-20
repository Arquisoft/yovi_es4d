FROM node:22

WORKDIR /usr/src/gatewayservice

# Copiar solo manifests primero (mejor caching)
COPY package*.json ./

# Instalar dependencias de forma reproducible
RUN npm ci --omit=dev

# Copiar código
COPY . .

# Crear usuario no root y ajustar permisos
RUN chown -R node:node /usr/src/gatewayservice

# Cambiar a usuario no root (clave para SonarQube)
USER node

# Ejecutar app
CMD ["node", "gateway-service.js"]