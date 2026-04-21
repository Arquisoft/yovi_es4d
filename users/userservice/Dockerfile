FROM node:22

WORKDIR /usr/src/userservice

# 1. Copiar dependencias primero (caché)
COPY --chmod=444 package*.json ./

# 2. Instalar dependencias
RUN npm ci --omit=dev --ignore-scripts

# 3. Copiar código
COPY --chown=root:root --chmod=444 user-service.js user-model.js ./

# 4. Ajustar ownership
RUN chown -R node:node /usr/src/userservice

# 5. (opcional) hardening permisos
RUN find /usr/src/userservice -type f -exec chmod 444 {} \; \
 && find /usr/src/userservice -type d -exec chmod 555 {} \;

# 6. usuario no root
USER node

EXPOSE 8001

CMD ["node", "user-service.js"]
