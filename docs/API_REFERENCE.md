# TeleStore API Reference

TeleStore is now a self-hosted Telegram media cloud. Users connect their own Telegram bot and channel, then upload media into that channel through the dashboard.

Base URL:

```txt
http://localhost:4000
```

## Authentication

All dashboard APIs use a user JWT:

```http
Authorization: Bearer <jwt>
```

TeleStore uses only user sessions and connected Telegram workspaces.

## Standard JSON Response

```json
{
  "success": true,
  "data": {}
}
```

Errors:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error"
  }
}
```

## Health

### GET `/health`

Response:

```json
{
  "status": "ok"
}
```

## Auth

### POST `/api/auth/register`

Request:

```json
{
  "email": "user@example.com",
  "password": "strong-password"
}
```

Response `201`:

```json
{
  "success": true,
  "data": {
    "token": "jwt_token_here"
  }
}
```

### POST `/api/auth/login`

Request:

```json
{
  "email": "user@example.com",
  "password": "strong-password"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "token": "jwt_token_here"
  }
}
```

## Workspaces

### Workspace Object

Bot tokens are encrypted in the database and only a masked token is returned.

```json
{
  "_id": "665f0f000000000000000001",
  "name": "Media Cloud",
  "slug": "media-cloud-a1b2c3",
  "telegramChannelId": "-1001234567890",
  "telegramBotUsername": "my_storage_bot",
  "telegramBotTokenMasked": "12345678:ABCD********",
  "telegramChannelTitle": "My Storage Channel",
  "storageUsed": 1048576,
  "bandwidthUsed": 0,
  "uploadCount": 4,
  "imageCount": 3,
  "videoCount": 1,
  "compressionSavings": 0,
  "isActive": true,
  "health": {
    "status": "healthy",
    "checkedAt": "2026-05-21T10:00:00.000Z",
    "message": "Telegram connection validated"
  },
  "createdBy": "665f0e000000000000000001",
  "createdAt": "2026-05-21T10:00:00.000Z",
  "updatedAt": "2026-05-21T10:00:00.000Z"
}
```

### GET `/api/workspaces`

Lists connected Telegram workspaces.

Response:

```json
{
  "success": true,
  "data": [
    {
      "_id": "665f0f000000000000000001",
      "name": "Media Cloud",
      "telegramBotUsername": "my_storage_bot",
      "telegramBotTokenMasked": "12345678:ABCD********",
      "telegramChannelId": "-1001234567890",
      "isActive": true
    }
  ]
}
```

### POST `/api/workspaces/validate`

Validates a bot token and channel before saving.

Request:

```json
{
  "telegramBotToken": "12345678:ABCDEF_FULL_TOKEN",
  "telegramChannelId": "-1001234567890"
}
```

Validation checks:

- bot token exists via `getMe`
- channel is accessible via `getChat`
- bot is admin via `getChatMember`
- bot username and channel info are fetched

Response:

```json
{
  "success": true,
  "data": {
    "botId": 12345678,
    "botUsername": "my_storage_bot",
    "botName": "My Storage Bot",
    "channelId": "-1001234567890",
    "channelTitle": "My Storage Channel",
    "channelType": "channel",
    "permissions": {
      "status": "administrator",
      "canPostMessages": true,
      "canDeleteMessages": false
    }
  }
}
```

### POST `/api/workspaces`

Creates a workspace and stores the encrypted Telegram bot token.

Request:

```json
{
  "name": "Media Cloud",
  "telegramBotToken": "12345678:ABCDEF_FULL_TOKEN",
  "telegramChannelId": "-1001234567890"
}
```

Response `201`:

```json
{
  "success": true,
  "data": {
    "_id": "665f0f000000000000000001",
    "name": "Media Cloud",
    "telegramBotUsername": "my_storage_bot",
    "telegramBotTokenMasked": "12345678:ABCD********",
    "telegramChannelId": "-1001234567890",
    "isActive": true,
    "health": {
      "status": "healthy",
      "message": "Telegram connection validated"
    }
  }
}
```

### PATCH `/api/workspaces/:id/reconnect`

Updates Telegram credentials and validates them again.

Request:

```json
{
  "telegramBotToken": "12345678:NEW_FULL_TOKEN",
  "telegramChannelId": "-1001234567890"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "_id": "665f0f000000000000000001",
    "telegramBotUsername": "my_storage_bot",
    "telegramBotTokenMasked": "12345678:NEWT********",
    "health": {
      "status": "healthy",
      "message": "Telegram connection validated"
    }
  }
}
```

## Uploads

### POST `/api/upload`

Uploads a file into the selected workspace's Telegram channel.

Content type:

```http
multipart/form-data
```

Form fields:

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `file` | File | Yes | Image, video, PDF, or document |
| `workspaceId` | String | Yes | Workspace to upload into |

Example:

```bash
curl -X POST http://localhost:4000/api/upload \
  -H "Authorization: Bearer <jwt>" \
  -F "workspaceId=665f0f000000000000000001" \
  -F "file=@image.png"
```

Response:

```json
{
  "success": true,
  "data": {
    "id": "665f10000000000000000001",
    "duplicate": false,
    "url": "/media/665f10000000000000000001",
    "signedUrl": "/media/665f10000000000000000001?token=..."
  }
}
```

## Media

### GET `/api/media`

Lists recent media.

Response:

```json
{
  "success": true,
  "data": [
    {
      "_id": "665f10000000000000000001",
      "originalName": "image.png",
      "mimeType": "image/webp",
      "size": 94512,
      "visibility": "private",
      "status": "ready",
      "createdAt": "2026-05-21T10:10:00.000Z"
    }
  ]
}
```

### GET `/api/media/:id`

Streams media from Telegram through the backend. Supports range requests for video.

```http
Range: bytes=0-1048575
```

Response:

- `200 OK` full content
- `206 Partial Content` range content

### DELETE `/api/media/:id`

Deletes a media record.

Response:

```txt
204 No Content
```

## Analytics

### GET `/api/analytics`

Response:

```json
{
  "success": true,
  "data": {
    "storageUsed": 1048576,
    "totalFiles": 12,
    "uploadRequests": 12,
    "bandwidthUsed": 0,
    "compressionSavings": 0,
    "apiRequests": 12,
    "imageCount": 8,
    "videoCount": 4,
    "workspaces": [],
    "recentUploads": [],
    "fileTypes": [],
    "activity": []
  }
}
```

## Common Errors

| Code | Meaning |
| --- | --- |
| `WORKSPACE_REQUIRED` | Upload is missing `workspaceId` |
| `TELEGRAM_VALIDATION_FAILED` | Bot token/channel validation failed |
| `TELEGRAM_BOT_NOT_ADMIN` | Bot is not admin in the channel |
| `UNSUPPORTED_MEDIA_TYPE` | File type is not allowed |
| `FORBIDDEN` | Missing or invalid JWT |
