FROM node:22-bookworm-slim AS base
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg ca-certificates \
  && rm -rf /var/lib/apt/lists/*

FROM base AS deps
COPY package*.json ./
RUN npm install

FROM deps AS build
COPY tsconfig.json eslint.config.js .prettierrc ./
COPY src ./src
RUN npm run build

FROM base AS runtime
ENV NODE_ENV=production
COPY package*.json ./
RUN npm install --omit=dev
COPY --from=build /app/dist ./dist
COPY .env.example ./
RUN mkdir -p tmp/uploads tmp/cache logs
EXPOSE 4000
CMD ["node", "dist/server.js"]
