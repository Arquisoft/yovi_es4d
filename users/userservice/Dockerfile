FROM node:22

WORKDIR /usr/src/userservice

# 1. Copiar dependencias primero (cachÃ©)
COPY --chmod=444 package*.json ./

# 3. Copiar cÃ³digo
COPY --chown=root:root --chmod=444 user-service.js user-model.js ./

# 4. Instalar dependencias, ajustar ownership y hardening de permisos
RUN npm ci --omit=dev --ignore-scripts \
 && chown -R node:node /usr/src/userservice \
 && find /usr/src/userservice -type f -exec chmod 444 {} \; \
 && find /usr/src/userservice -type d -exec chmod 555 {} \;

# 6. usuario no root
USER node

EXPOSE 8001

CMD ["node", "user-service.js"]
