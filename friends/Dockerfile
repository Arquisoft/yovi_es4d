FROM node:22

WORKDIR /usr/src/friends

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 8004

CMD ["node", "friend-service.js"]
