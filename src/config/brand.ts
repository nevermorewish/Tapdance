import activeBrand from './activeBrand.ts';

export type BrandConfig = {
  id: string;
  appName: string;
  productName: string;
  appId: string;
  serviceUrl: string;
  registerUrl: string;
  rechargeUrl: string;
  textModel: string;
  imageModel: string;
  videoModel: string;
};

export const BRAND: BrandConfig = activeBrand as BrandConfig;
