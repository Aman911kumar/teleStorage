import fs from "node:fs/promises";
import path from "node:path";
import ffmpeg from "fluent-ffmpeg";
import sharp from "sharp";
import { nanoid } from "nanoid";
import { env } from "../../config/env.js";

export interface ProcessedFile {
  path: string;
  filename: string;
  mimeType: string;
  width?: number;
  height?: number;
  duration?: number;
  label?: string;
}

export class MediaProcessor {
  async processImage(filePath: string): Promise<{ main: ProcessedFile; thumbnail: ProcessedFile }> {
    await fs.mkdir(env.UPLOAD_TMP_DIR, { recursive: true });
    const meta = await sharp(filePath).metadata();
    const mainPath = path.join(env.UPLOAD_TMP_DIR, `${nanoid()}.jpg`);
    const thumbPath = path.join(env.UPLOAD_TMP_DIR, `${nanoid()}-thumb.jpg`);

    await sharp(filePath)
      .rotate()
      .resize({ width: 1920, withoutEnlargement: true })
      .jpeg({ quality: 84, mozjpeg: true })
      .toFile(mainPath);
    await sharp(filePath)
      .rotate()
      .resize(400, 400, { fit: "cover" })
      .jpeg({ quality: 78, mozjpeg: true })
      .toFile(thumbPath);

    return {
      main: { path: mainPath, filename: path.basename(mainPath), mimeType: "image/jpeg", width: meta.width, height: meta.height },
      thumbnail: { path: thumbPath, filename: path.basename(thumbPath), mimeType: "image/jpeg", label: "thumbnail" }
    };
  }

  async createVideoVariants(filePath: string): Promise<{ variants: ProcessedFile[]; thumbnail: ProcessedFile }> {
    await fs.mkdir(env.UPLOAD_TMP_DIR, { recursive: true });
    const qualities = [
      { label: "240p", height: 240 },
      { label: "480p", height: 480 },
      { label: "720p", height: 720 }
    ];

    const variants = await Promise.all(
      qualities.map(async (quality) => {
        const output = path.join(env.UPLOAD_TMP_DIR, `${nanoid()}-${quality.label}.mp4`);
        await this.transcode(filePath, output, quality.height);
        return {
          path: output,
          filename: path.basename(output),
          mimeType: "video/mp4",
          label: quality.label,
          height: quality.height
        };
      })
    );

    const thumbPath = path.join(env.UPLOAD_TMP_DIR, `${nanoid()}-video-thumb.webp`);
    await this.videoThumbnail(filePath, thumbPath);
    return {
      variants,
      thumbnail: { path: thumbPath, filename: path.basename(thumbPath), mimeType: "image/webp", label: "thumbnail" }
    };
  }

  private transcode(input: string, output: string, height: number) {
    return new Promise<void>((resolve, reject) => {
      ffmpeg(input)
        .outputOptions([
          "-movflags +faststart",
          "-preset veryfast",
          "-crf 28",
          `-vf scale=-2:${height}`,
          "-c:v libx264",
          "-c:a aac",
          "-b:a 128k"
        ])
        .on("end", () => resolve())
        .on("error", reject)
        .save(output);
    });
  }

  private videoThumbnail(input: string, output: string) {
    return new Promise<void>((resolve, reject) => {
      ffmpeg(input)
        .screenshots({
          timestamps: ["10%"],
          filename: path.basename(output),
          folder: path.dirname(output),
          size: "640x?"
        })
        .on("end", async () => {
          const generated = output.replace(/\.webp$/, ".png");
          try {
            await sharp(generated).webp({ quality: 78 }).toFile(output);
            await fs.rm(generated, { force: true });
          } catch {
            // Some ffmpeg builds can write directly to requested extension.
          }
          resolve();
        })
        .on("error", reject);
    });
  }
}
