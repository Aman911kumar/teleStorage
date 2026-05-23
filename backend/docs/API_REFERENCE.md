# TeleStorage API Reference

TeleStorage is now a self-hosted Telegram media cloud. Users connect their own Telegram bot and channel, then upload media into that channel through the dashboard.

Base URL:

```txt
<API_BASE_URL>
```

Use your deployed backend origin for `<API_BASE_URL>`.
Examples:

- Local backend: `http://localhost:4000`
- Production backend: `https://storageapi.example.com`

## Authentication

All dashboard APIs use a user JWT:

```http
Authorization: Bearer <jwt>
```

Dashboard APIs use user sessions and connected Telegram workspaces.

External app APIs use scoped API credentials:

```http
x-api-key: your_api_key_here
x-api-secret: example_secret
```

You can create, revoke and regenerate API keys from the API Access dashboard. Secret keys are shown once and stored as a hash.

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
  "publicProjectId": "prj_abc123xyz78900",
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
    "publicProjectId": "prj_abc123xyz78900",
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

## API Keys

### GET `/api/api-keys`

Lists API keys owned by the authenticated user. Optional query param: `workspaceId`.

Response:

```json
{
  "success": true,
  "data": [
    {
      "_id": "665f30000000000000000001",
      "workspaceId": "665f0f000000000000000001",
      "name": "Production key",
      "publicKey": "demo_key",
      "publicKeyMasked": "demo_key",
      "scopes": ["full"],
      "status": "active",
      "lastUsedAt": null,
      "createdAt": "2026-05-22T10:00:00.000Z"
    }
  ]
}
```

### POST `/api/api-keys`

Creates a scoped API key. The `secret` is returned only once.

Request:

```json
{
  "workspaceId": "665f0f000000000000000001",
  "name": "Production key",
  "scopes": ["upload", "read"]
}
```

Response `201`:

```json
{
  "success": true,
  "data": {
    "_id": "665f30000000000000000001",
    "name": "Production key",
    "publicKey": "demo_key",
    "publicKeyMasked": "demo_key",
    "secret": "example_secret",
    "scopes": ["upload", "read"],
    "status": "active"
  }
}
```

### POST `/api/api-keys/:id/regenerate`

Generates a new secret for an existing API key. The new `secret` is returned only once.

### DELETE `/api/api-keys/:id`

Revokes an API key. Revoked keys can no longer call `/api/v1/*`.

### GET `/api/api-request-logs`

Lists recent API requests. Optional query param: `workspaceId`.

Response:

```json
{
  "success": true,
  "data": [
    {
      "_id": "665f40000000000000000001",
      "method": "POST",
      "path": "/api/v1/upload",
      "statusCode": 201,
      "durationMs": 532,
      "success": true,
      "createdAt": "2026-05-22T10:01:00.000Z"
    }
  ]
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
curl -X POST <API_BASE_URL>/api/upload \
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

## External App API v1

These endpoints are designed for future SDKs and external apps. They do not expose Telegram bot tokens or raw Telegram URLs.

Required headers:

```http
x-api-key: your_api_key_here
x-api-secret: example_secret
```

Alternative bearer format:

```http
Authorization: Bearer <your_api_key_here>:<example_secret>
```

### POST `/api/v1/upload`

Uploads one or more files into the authenticated workspace.

Content type:

```http
multipart/form-data
```

Form fields:

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `file` | File | No | Single file upload |
| `files` | File[] | No | Multiple files, up to 10 |
| `folderId` | String | No | Folder to place files in |
| `visibility` | `private` or `public` | No | Defaults to `private` |
| `tags` | JSON string array | No | Example: `["avatar","user"]` |
| `metadata` | JSON object | No | Custom string metadata |
| `filename` | String | No | Custom display filename |

Example:

```bash
curl -X POST <API_BASE_URL>/api/v1/upload \
  -H "x-api-key: your_api_key_here" \
  -H "x-api-secret: example_secret" \
  -F "file=@image.png" \
  -F "visibility=public" \
  -F 'tags=["avatar"]'
```

Response `201`:

```json
{
  "success": true,
  "data": {
    "files": [
      {
        "id": "665f10000000000000000001",
        "duplicate": false,
        "url": "/media/665f10000000000000000001",
        "signedUrl": "/media/665f10000000000000000001?token=...",
        "publicUrl": "/media/665f10000000000000000001/view",
        "apiUrl": "/api/v1/media/665f10000000000000000001"
      }
    ]
  }
}
```

### GET `/api/v1/media/:id`

Returns metadata for a file in the authenticated workspace.

Response:

```json
{
  "success": true,
  "data": {
    "id": "665f10000000000000000001",
    "originalName": "image.png",
    "mimeType": "image/webp",
    "size": 94512,
    "visibility": "public",
    "tags": ["avatar"],
    "folderId": "665f20000000000000000001",
    "metadata": {
      "userId": "42"
    },
    "status": "ready",
    "publicUrl": "/media/665f10000000000000000001/view",
    "apiUrl": "/api/v1/media/665f10000000000000000001"
  }
}
```

### HEAD `/api/v1/media/:id`

Returns object metadata headers without downloading the file body.

Headers:

```http
Content-Type: image/webp
Content-Length: 94512
ETag: "checksum"
```

### POST `/api/v1/media/:id/links`

Generates expiring URLs for private delivery. If image transform options are included, the transform parameters are bound into the token so they cannot be changed without invalidating the link.

Request:

```json
{
  "expiresInSeconds": 900,
  "transform": {
    "width": 800,
    "height": 600,
    "format": "webp",
    "quality": 82,
    "fit": "inside"
  }
}
```

Response:

```json
{
  "success": true,
  "data": {
    "expiresInSeconds": 900,
    "viewUrl": "/media/665f10000000000000000001/view?token=...&w=800&h=600&q=82&format=webp&fit=inside",
    "downloadUrl": "/media/665f10000000000000000001/download?token=...",
    "thumbnailUrl": "/media/665f10000000000000000001/thumb?token=..."
  }
}
```

## Media Delivery URLs

### GET `/media/:id/view`

Streams the file through the backend Telegram proxy. Supports image previews, video range requests, `ETag`, `If-None-Match`, `Cache-Control`, `Accept-Ranges`, and inline display.

Image transformations are available through query params:

| Param | Values | Description |
| --- | --- | --- |
| `w` / `width` | 1-4096 | Resize width |
| `h` / `height` | 1-4096 | Resize height |
| `format` | `webp`, `jpeg`, `png`, `avif` | Output format |
| `q` / `quality` | 1-100 | Output quality |
| `fit` | `inside`, `cover`, `contain`, `outside` | Resize mode |

Example:

```txt
/media/665f10000000000000000001/view?w=800&format=webp&q=82&fit=inside
```

### GET `/media/:id/download`

Streams the file with `Content-Disposition: attachment`.

### GET `/media/:id/thumb`

Streams the generated thumbnail when available.

### PATCH `/api/v1/media/:id`

Renames or moves a file.

Request:

```json
{
  "originalName": "profile-avatar.png",
  "folderId": "665f20000000000000000001"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "_id": "665f10000000000000000001",
    "originalName": "profile-avatar.png",
    "folderId": "665f20000000000000000001"
  }
}
```

### DELETE `/api/v1/media/:id`

Deletes the Telegram message and MongoDB media record.

Response:

```txt
204 No Content
```

### GET `/api/v1/files`

Lists workspace files. Optional query params: `folderId`, `limit`.

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
      "visibility": "public",
      "status": "ready"
    }
  ]
}
```

### GET `/api/v1/search`

Searches filenames and tags. Query params: `q`, `limit`.

Response:

```json
{
  "success": true,
  "data": []
}
```

### POST `/api/v1/folders`

Creates a folder.

Request:

```json
{
  "name": "avatars",
  "parentId": "665f20000000000000000001",
  "metadata": {
    "scope": "users"
  }
}
```

Response `201`:

```json
{
  "success": true,
  "data": {
    "_id": "665f20000000000000000001",
    "name": "avatars",
    "path": "avatars",
    "workspaceId": "665f0f000000000000000001"
  }
}
```

### GET `/api/v1/folders`

Lists folders. Optional query param: `parentId`.

Response:

```json
{
  "success": true,
  "data": []
}
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
