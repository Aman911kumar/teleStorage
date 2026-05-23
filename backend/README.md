# TeleStorage Media Platform

A production-oriented Node.js, Express, MongoDB, Redis, BullMQ, React, and Telegram Bot API media storage platform. It is provider-based so future apps can keep the same media API while migrating storage from Telegram to S3, Cloudflare R2, or Cloudinary.

## Features

- Clean modular TypeScript architecture
- JWT auth and role-based admin routes
- Provider abstraction for upload, delete, signed URLs, and streaming
- Telegram private channel storage provider
- Multer uploads with MIME and file signature validation
- Sharp image optimization, WebP conversion, EXIF cleanup, thumbnails
- FFmpeg video variant generation foundation for 240p, 480p, and 720p
- BullMQ queues for image processing, video transcoding, thumbnails, cleanup, and retry uploads
- Local `QUEUE_DRIVER=memory` mode for development without Redis
- MongoDB media schema with variants, thumbnail, checksum duplicate detection, visibility, tags, metadata, and status
- Private media delivery through `GET /media/:id` with signed URL support
- Range-aware streaming, ETag, cache headers, and CDN-ready responses
- Docker, Compose, health check, Winston logging, environment validation, graceful shutdown

## Quick Start

```bash
npm install
cp .env.example .env
npm run dev
```

In another terminal:

```bash
npm run worker:dev
```

Redis is optional for local development. Keep `QUEUE_DRIVER=memory` in `.env` if you do not have Redis. Use `QUEUE_DRIVER=bullmq` and `REDIS_URL=...` for production/background worker deployments.

With Docker:

```bash
docker compose up --build
```

## Frontend

The React frontend lives in `frontend/`.

```bash
npm run dev:fullstack
```

This starts the backend on port `4000` and the Vite frontend on port `5173`.

To allow multiple frontend domains, add them comma-separated in `.env`:

```env
CORS_ORIGINS=http://localhost:5173,https://app.example.com,https://admin.example.com
```

Frontend-only commands:

```bash
npm run dev:frontend
npm run build:frontend
```

## Telegram Setup

1. Create a bot with BotFather.
2. Create a private channel.
3. Add the bot as an admin.
4. Put the bot token and channel id in `.env`.

Raw Telegram URLs and the bot token are never returned to clients. Clients receive internal service URLs.

## Folder Structure

```text
src/
  modules/
    media/
    auth/
    storage/
    users/
  providers/
    telegram/
    s3/
    cloudinary/
    local/
  queues/
  workers/
  middlewares/
  utils/
  config/
  core/
```

See [API reference](docs/API_REFERENCE.md), [API docs](docs/API.md), and [deployment guide](docs/DEPLOYMENT.md).
