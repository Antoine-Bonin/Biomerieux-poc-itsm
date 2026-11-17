FROM node:22-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install express zod @types/node @types/express typescript

COPY . .

EXPOSE 3000

CMD ["node", "--experimental-strip-types", "server.ts"]