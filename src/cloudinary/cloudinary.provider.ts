import { v2 } from 'cloudinary';

export const CloudinaryProvider = {
  provide: 'Cloudinary',
  useFactory: () => {
    return v2.config({
      cloud_name: 'dftosfmzr',
      api_key: '463434218569586',
      api_secret: 'NOgwEB__OiB_Yiema7stds3nr0M',
    });
  },
};
