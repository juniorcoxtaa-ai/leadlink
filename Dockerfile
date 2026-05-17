FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

ENV NODE_ENV=production
ENV BABEL_ENV=production

EXPOSE 3000

RUN npm run build

CMD ["npm", "run", "start"]
