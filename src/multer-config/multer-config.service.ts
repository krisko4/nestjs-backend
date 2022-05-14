import { Injectable } from '@nestjs/common';
import {
  MulterOptionsFactory,
  MulterModuleOptions,
} from '@nestjs/platform-express';

@Injectable()
export class MulterConfigService implements MulterOptionsFactory {
  createMulterOptions(): MulterModuleOptions {
    return {
      dest: '/tmp/',
      limits: {
        fileSize: 2000000,
      },
      fileFilter: function (req, file, callback) {
        const mimetype = file.mimetype;
        if (!mimetype.startsWith('image/')) {
          return callback(new Error('Only images are allowed'), false);
        }
        callback(null, true);
      },
    };
  }
}
