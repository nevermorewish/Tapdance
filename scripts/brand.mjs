import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const BRANDS_DIR = join(ROOT, 'brands');
export const DEFAULT_BRAND_ID = 'huanxing';
export const REQUIRED_BRAND_FIELDS = [
  'id', 'serviceUrl', 'registerUrl',
  'rechargeUrl', 'textModel', 'imageModel', 'videoModel',
];

export function listBrands() {
  if (!existsSync(BRANDS_DIR)) return [];
  return readdirSync(BRANDS_DIR)
    .filter((file) => file.endsWith('.json'))
    .map((file) => file.slice(0, -5))
    .sort();
}

export function loadBrand(id = process.env.BRAND || DEFAULT_BRAND_ID) {
  const brandId = String(id || DEFAULT_BRAND_ID).trim();
  const file = join(BRANDS_DIR, `${brandId}.json`);
  if (!existsSync(file)) {
    throw new Error(`未知品牌 ${brandId}，可用品牌：${listBrands().join(', ')}`);
  }
  let brand;
  try {
    brand = JSON.parse(readFileSync(file, 'utf8'));
  } catch (error) {
    throw new Error(`品牌配置解析失败：${file}；${error instanceof Error ? error.message : String(error)}`);
  }
  const missing = REQUIRED_BRAND_FIELDS.filter((field) => field === 'videoModel'
    ? !Array.isArray(brand?.[field]) || brand[field].length === 0 || brand[field].some((value) => !String(value || '').trim())
    : !String(brand?.[field] || '').trim());
  if (missing.length) throw new Error(`品牌配置缺少字段：${missing.join(', ')}`);
  if (brand.id !== brandId) throw new Error(`品牌配置 id 与文件名不一致：${brand.id} !== ${brandId}`);
  return {
    id: brand.id,
    serviceUrl: brand.serviceUrl,
    registerUrl: brand.registerUrl,
    rechargeUrl: brand.rechargeUrl,
    textModel: brand.textModel,
    imageModel: brand.imageModel,
    videoModel: brand.videoModel.map((value) => String(value).trim()),
    updateFeedBaseUrl: String(brand.updateFeedBaseUrl || `https://huanxing.tos-cn-beijing.volces.com/package/Tapdance/${brand.id === 'huanxing' ? '' : `${brand.id}/`}latest`).trim(),
  };
}
