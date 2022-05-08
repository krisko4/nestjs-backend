import { Injectable } from '@nestjs/common';
import { v2 } from 'cloudinary';

@Injectable()
export class CloudinaryService {
  async destroyImage(imageId: string) {
    return v2.uploader.destroy(imageId);
  }
  async uploadImage(path: string, uploadPreset: string): Promise<string> {
    return new Promise((resolve, reject) => {
      v2.uploader.upload(
        path,
        { upload_preset: uploadPreset },
        (error, result) => {
          if (error) return reject(error);
          resolve(result.public_id);
        },
      );
    });
  }
}
