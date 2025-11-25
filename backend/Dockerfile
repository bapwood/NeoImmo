FROM node:20

WORKDIR /src/backend

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build

CMD ["node", "dist/main"]