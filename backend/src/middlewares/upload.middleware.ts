import fs from "node:fs";
import path from "node:path";
import multer from "multer";
import { nanoid } from "nanoid";
import { env } from "../config/env.js";
import { trackTempFile } from "../utils/activeTempFiles.js";

fs.mkdirSync(env.UPLOAD_TMP_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    fs.mkdir(env.UPLOAD_TMP_DIR, { recursive: true }, (error) => {
      cb(error, env.UPLOAD_TMP_DIR);
    });
  },
  filename: (_req, file, cb) => {
    const safeName = file.originalname.replace(/[\\/]+/g, "-").replace(/\s+/g, "_");
    const filename = `${Date.now()}-${nanoid()}-${safeName}`;
    trackTempFile(path.join(env.UPLOAD_TMP_DIR, filename));
    cb(null, filename);
  }
});

export const upload = multer({
  storage,
  limits: {
    fileSize: env.MAX_UPLOAD_MB * 1024 * 1024,
    files: 10
  }
});
