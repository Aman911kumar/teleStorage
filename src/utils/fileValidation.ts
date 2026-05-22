import { fileTypeFromFile } from "file-type";
import { AppError } from "../core/errors.js";

const allowedMimePrefixes = ["image/", "video/"];
const allowedMimes = new Set([
  "application/pdf",
  "text/plain",
  "application/zip",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
]);

export async function validateFileSignature(path: string, claimedMime: string) {
  const detected = await fileTypeFromFile(path).catch((error: NodeJS.ErrnoException) => {
    if (error.code === "ENOENT") {
      throw new AppError("Upload temp file was not available. Please retry the upload.", 400, "UPLOAD_TEMP_FILE_MISSING");
    }
    throw error;
  });
  const mime = detected?.mime ?? claimedMime;
  const allowed = allowedMimePrefixes.some((prefix) => mime.startsWith(prefix)) || allowedMimes.has(mime);
  if (!allowed) {
    throw new AppError(`Unsupported file type: ${mime}`, 415, "UNSUPPORTED_MEDIA_TYPE");
  }
  return { mime, extension: detected?.ext };
}
