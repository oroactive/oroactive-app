FROM node:20-alpine

ARG GIT_COMMIT=unknown
ARG BUILD_TIME=unknown
ARG BUILD_NUMBER=local

WORKDIR /app

RUN apk add --no-cache postgresql-client

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

ENV NODE_ENV=production
ENV OROACTIVE_GIT_COMMIT=$GIT_COMMIT
ENV OROACTIVE_BUILD_TIME=$BUILD_TIME
ENV OROACTIVE_BUILD_NUMBER=$BUILD_NUMBER

EXPOSE 3000

CMD ["npm", "start"]
