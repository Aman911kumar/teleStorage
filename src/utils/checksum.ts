import crypto from "node:crypto";
import fs from "node:fs";
import { AppError } from "../core/errors.js";

export function sha256File(path: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash("sha256");
    fs.createReadStream(path)
      .on("data", (chunk) => hash.update(chunk))
      .on("error", (error: NodeJS.ErrnoException) => {
        if (error.code === "ENOENT") {
          reject(new AppError("Upload temp file was not available. Please retry the upload.", 400, "UPLOAD_TEMP_FILE_MISSING"));
          return;
        }
        reject(error);
      })
      .on("end", () => resolve(hash.digest("hex")));
  });
}
