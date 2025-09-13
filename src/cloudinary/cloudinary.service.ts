import { Injectable } from '@nestjs/common';
import { v2 } from 'cloudinary';
import * as sharp from 'sharp';
import * as fs from 'fs';

@Injectable()
export class CloudinaryService {
  async uploadImage(
    file: Express.Multer.File,
    uploadPreset: string,
  ): Promise<string> {
    const buffer = fs.readFileSync(file.path);
    const webpBuffer = await sharp(buffer).webp().toBuffer();
    return new Promise((resolve, reject) => {
      const stream = v2.uploader.upload_stream(
        { resource_type: 'image', upload_preset: uploadPreset, format: 'webp' },
        (error, result) => {
          if (error) return reject(error);
          resolve(result.public_id);
        },
      );
      stream.end(webpBuffer);
    });
  }

  async destroyImage(imageId: string) {
    return v2.uploader.destroy(imageId);
  }
}
