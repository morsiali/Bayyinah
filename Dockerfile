# Single-container deployment (Node + SQLite on a mounted volume).
FROM node:22-bookworm-slim AS deps
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm ci

FROM deps AS build
COPY . .
RUN npx prisma generate && npx next build

FROM node:22-bookworm-slim AS run
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production PORT=3000 DATABASE_URL="file:/data/bayyinah.db" STORAGE_DIR=/data/storage
COPY --from=build /app ./
RUN mkdir -p /data/storage
VOLUME ["/data"]
EXPOSE 3000
CMD ["sh", "-c", "npx prisma db push --skip-generate && npx next start -p ${PORT}"]
