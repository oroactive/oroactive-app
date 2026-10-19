FROM node:24-alpine3.23

ARG GIT_COMMIT=unknown
ARG BUILD_TIME=unknown
ARG BUILD_NUMBER=local
ARG SOURCE_COMMIT=unknown
ARG SOURCE_BRANCH=unknown

WORKDIR /app

RUN apk add --no-cache postgresql18-client git

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

HEALTHCHECK --interval=30s --timeout=5s --start-period=45s --retries=5 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"]

CMD ["npm", "start"]
