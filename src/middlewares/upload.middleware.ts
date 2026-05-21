import fs from "node:fs";
import multer from "multer";
import { nanoid } from "nanoid";
import { env } from "../config/env.js";

fs.mkdirSync(env.UPLOAD_TMP_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, env.UPLOAD_TMP_DIR),
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${nanoid()}-${file.originalname}`)
});

export const upload = multer({
  storage,
  limits: {
    fileSize: env.MAX_UPLOAD_MB * 1024 * 1024,
    files: 1
  }
});
