FROM node:22

WORKDIR /usr/src/friends

# Dependencias primero
COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts


RUN chmod -R a-w /usr/src/friends

RUN mkdir -p /usr/src/friends/logs \
    && chown -R node:node /usr/src/friends/logs \
    && chmod -R 755 /usr/src/friends/logs

USER node

EXPOSE 8004

CMD ["node", "friend-service.js"]
