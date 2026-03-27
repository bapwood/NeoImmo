FROM node:20

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install

COPY . .

RUN mkdir -p /usr/src/app/uploads/properties

CMD ["npm", "run", "start:dev"]
