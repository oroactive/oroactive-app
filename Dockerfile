FROM node:20-alpine

ARG GIT_COMMIT=unknown
ARG BUILD_TIME=unknown
ARG BUILD_NUMBER=local
ARG SOURCE_COMMIT=unknown
ARG SOURCE_BRANCH=unknown

WORKDIR /app

RUN apk add --no-cache postgresql-client git

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

RUN node -e 'const fs=require("node:fs"); const {execSync}=require("node:child_process"); const usable=(value)=>value && !["unknown","local","HEAD"].includes(String(value)); const git=(cmd)=>{try{return execSync("git "+cmd,{stdio:["ignore","pipe","ignore"]}).toString().trim()}catch{return ""}}; const gitCommit=git("rev-parse HEAD"); const gitBranch=git("rev-parse --abbrev-ref HEAD"); const gitBuildNumber=git("rev-list --count HEAD"); const commit=usable(process.env.GIT_COMMIT) ? process.env.GIT_COMMIT : usable(process.env.SOURCE_COMMIT) ? process.env.SOURCE_COMMIT : usable(gitCommit) ? gitCommit : "unknown"; const shortCommit=usable(commit) ? commit.slice(0,12) : "unknown"; const buildNumber=usable(process.env.BUILD_NUMBER) ? process.env.BUILD_NUMBER : usable(gitBuildNumber) ? gitBuildNumber : shortCommit !== "unknown" ? "git-"+shortCommit : "local"; const metadata={app:"OroActive",service:"oroactive-gestionale",commit,shortCommit,buildTime:usable(process.env.BUILD_TIME) ? process.env.BUILD_TIME : new Date().toISOString(),buildNumber,branch:process.env.SOURCE_BRANCH || gitBranch || "main",packageVersion:require("./package.json").version,environment:"production"}; fs.writeFileSync("version.json", JSON.stringify(metadata,null,2)+"\n");'

ENV NODE_ENV=production
ENV OROACTIVE_GIT_COMMIT=$GIT_COMMIT
ENV OROACTIVE_BUILD_TIME=$BUILD_TIME
ENV OROACTIVE_BUILD_NUMBER=$BUILD_NUMBER
ENV SOURCE_COMMIT=$SOURCE_COMMIT
ENV SOURCE_BRANCH=$SOURCE_BRANCH

EXPOSE 3000

CMD ["npm", "start"]
