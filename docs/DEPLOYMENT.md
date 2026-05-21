# Deployment Guide

## Required services

- Node.js 20+
- MongoDB 7+
- Redis 7+
- FFmpeg installed on the API and worker hosts
- Telegram bot added as administrator to a private channel

## Docker

1. Copy `.env.example` to `.env`.
2. Set `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHANNEL_ID`, `JWT_SECRET`, and `SIGNED_URL_SECRET`.
3. Run:

```bash
docker compose up --build
```

Production deployments should run at least one API process and one worker process. Scale workers independently for heavy video workloads.

## Provider migration

Business logic uses `StorageProvider`. To migrate from Telegram to S3, R2, or Cloudinary, implement the placeholder provider and change `STORAGE_PROVIDER`. Existing media can be migrated by reading each `providerFileId`, uploading to the new provider, and updating provider metadata in MongoDB.
