FROM node:22

WORKDIR /usr/src/userservice

# Copiar solo dependencias primero (mejor caching)
COPY package*.json ./

# Instalar dependencias de forma reproducible
RUN npm ci --omit=dev --ignore-scripts

# Copiar código fuente
COPY --chown=node:node . .

# Cambiar ownership al usuario node
RUN chown -R node:node /usr/src/userservice

# Ejecutar como usuario no root (clave para SonarQube)
USER node

# Exponer puerto
EXPOSE 8001

# Comando de arranque
CMD ["node", "user-service.js"]