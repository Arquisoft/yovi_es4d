FROM node:22

WORKDIR /usr/src/authservice

# Copiar dependencias primero (caché)
COPY package*.json ./

# Instalar dependencias reproducibles
RUN npm ci --omit=dev --ignore-scripts

# Copiar código fuente con ownership correcto
COPY --chown=node:node auth-service.js auth-model.js ./

# Usuario no root (seguridad)
USER node

EXPOSE 8002

CMD ["node", "auth-service.js"]
