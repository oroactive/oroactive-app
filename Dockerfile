FROM node:20-alpine

ARG GIT_COMMIT=unknown
ARG BUILD_TIME=unknown
ARG BUILD_NUMBER=local
ARG SOURCE_COMMIT=unknown
ARG SOURCE_BRANCH=unknown

WORKDIR /app

RUN apk add --no-cache postgresql-client git

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

RUN node scripts/write-version-metadata.mjs

ENV NODE_ENV=production
ENV OROACTIVE_GIT_COMMIT=$GIT_COMMIT
ENV OROACTIVE_BUILD_TIME=$BUILD_TIME
ENV OROACTIVE_BUILD_NUMBER=$BUILD_NUMBER
ENV SOURCE_COMMIT=$SOURCE_COMMIT
ENV SOURCE_BRANCH=$SOURCE_BRANCH

EXPOSE 3000

CMD ["npm", "start"]
