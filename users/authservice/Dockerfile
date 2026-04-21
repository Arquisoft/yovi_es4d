FROM node:22

WORKDIR /usr/src/authservice

# Copiar solo manifests primero (mejor caching)
COPY package*.json ./

# Instalar dependencias de forma reproducible
RUN npm ci --omit=dev

# Copiar código fuente
COPY . .

# Crear usuario no root
RUN chown -R node:node /usr/src/authservice

# Cambiar a usuario no root (esto es clave para SonarQube)
USER node

# Exponer puerto
EXPOSE 8002

# Ejecutar app
CMD ["node", "auth-service.js"]