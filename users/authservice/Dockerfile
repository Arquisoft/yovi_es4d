FROM node:22

WORKDIR /usr/src/userservice

# Copiar solo dependencias primero (mejor caching)
COPY package*.json ./

# Instalar dependencias de forma reproducible
# NOSONAR: npm ci ejecuta scripts necesarios de dependencias confiables
RUN npm ci --omit=dev

# Copiar código fuente
COPY . .

# Cambiar ownership al usuario node
RUN chown -R node:node /usr/src/userservice

# Ejecutar como usuario no root (clave para SonarQube)
USER node

# Exponer puerto
EXPOSE 8001

# Comando de arranque
CMD ["node", "user-service.js"]