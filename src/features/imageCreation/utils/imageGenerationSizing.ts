export type ImageAspectRatio =
  | '1:1'
  | '4:5'
  | '5:4'
  | '3:4'
  | '4:3'
  | '2:3'
  | '3:2'
  | '9:16'
  | '16:9'
  | '21:9'
  | '9:21'
  | '4:1'
  | '1:4'
  | '8:1'
  | '1:8';

export type ImageResolution = '1K' | '2K' | '4K' | 'custom';

export const IMAGE_ASPECT_RATIO_OPTIONS: Array<{ value: ImageAspectRatio; label: string }> = [
  { value: '1:1', label: '1:1 方图' },
  { value: '4:5', label: '4:5 竖版社媒' },
  { value: '5:4', label: '5:4 横版产品' },
  { value: '3:4', label: '3:4 竖版照片' },
  { value: '4:3', label: '4:3 经典横图' },
  { value: '2:3', label: '2:3 竖图' },
  { value: '3:2', label: '3:2 横图' },
  { value: '9:16', label: '9:16 手机竖屏' },
  { value: '16:9', label: '16:9 宽屏' },
  { value: '21:9', label: '21:9 超宽屏' },
  { value: '9:21', label: '9:21 长竖屏' },
  { value: '4:1', label: '4:1 横幅' },
  { value: '1:4', label: '1:4 长图' },
  { value: '8:1', label: '8:1 超横幅' },
  { value: '1:8', label: '1:8 超长图' },
];

export const IMAGE_RESOLUTION_OPTIONS: Array<{ value: ImageResolution; label: string; hint: string }> = [
  { value: '1K', label: '1K 标准', hint: '速度优先，适合批量预览' },
  { value: '2K', label: '2K 高清', hint: '更清晰，适合交付候选' },
  { value: '4K', label: '4K 超清', hint: '高成本，取决于模型支持' },
  { value: 'custom', label: '自定义', hint: '手动输入宽高，按 WIDTHxHEIGHT 发送' },
];

export const CUSTOM_IMAGE_SIZE_MIN = 64;
export const CUSTOM_IMAGE_SIZE_MAX = 3840;

const SIZE_BY_RATIO: Record<ImageAspectRatio, string> = {
  '1:1': '1024x1024',
  '4:5': '1024x1280',
  '5:4': '1280x1024',
  '3:4': '1152x1536',
  '4:3': '1536x1152',
  '2:3': '1024x1536',
  '3:2': '1536x1024',
  '9:16': '1024x1792',
  '16:9': '1792x1024',
  '21:9': '2016x864',
  '9:21': '864x2016',
  '4:1': '2048x512',
  '1:4': '512x2048',
  '8:1': '2048x256',
  '1:8': '256x2048',
};

const GPT_IMAGE_2_2K_SIZE_BY_RATIO: Partial<Record<ImageAspectRatio, string>> = {
  '1:1': '2048x2048',
  '4:5': '1792x2240',
  '5:4': '2240x1792',
  '3:4': '1536x2048',
  '4:3': '2048x1536',
  '2:3': '1360x2048',
  '3:2': '2048x1360',
  '9:16': '1152x2048',
  '16:9': '2048x1152',
  '21:9': '2048x880',
  '9:21': '880x2048',
};

const GPT_IMAGE_2_4K_SIZE_BY_RATIO: Partial<Record<ImageAspectRatio, string>> = {
  '1:1': '2880x2880',
  '4:5': '2560x3200',
  '5:4': '3200x2560',
  '3:4': '2400x3200',
  '4:3': '3200x2400',
  '2:3': '2304x3456',
  '3:2': '3456x2304',
  '9:16': '2160x3840',
  '16:9': '3840x2160',
  '21:9': '3840x1648',
  '9:21': '1648x3840',
};

function clampDimension(value: unknown) {
  const parsed = Math.round(Number(value));
  if (!Number.isFinite(parsed)) return '';
  return String(Math.max(CUSTOM_IMAGE_SIZE_MIN, Math.min(CUSTOM_IMAGE_SIZE_MAX, parsed)));
}

export function normalizeCustomImageSize(width?: string, height?: string) {
  const normalizedWidth = clampDimension(width);
  const normalizedHeight = clampDimension(height);
  return normalizedWidth && normalizedHeight ? `${normalizedWidth}x${normalizedHeight}` : '';
}

function scaleSize(size: string, resolution: Exclude<ImageResolution, '1K' | 'custom'>) {
  const [width, height] = size.split('x').map(Number);
  if (!Number.isFinite(width) || !Number.isFinite(height)) return size;
  const multiplier = resolution === '4K' ? 4 : 2;
  let nextWidth = Math.round(width * multiplier);
  let nextHeight = Math.round(height * multiplier);
  const longest = Math.max(nextWidth, nextHeight);
  if (longest > CUSTOM_IMAGE_SIZE_MAX) {
    const factor = CUSTOM_IMAGE_SIZE_MAX / longest;
    nextWidth = Math.round(nextWidth * factor);
    nextHeight = Math.round(nextHeight * factor);
  }
  return `${nextWidth}x${nextHeight}`;
}

export function resolveImageGenerationSize(
  aspectRatio: ImageAspectRatio = '1:1',
  resolution: ImageResolution = '1K',
  customWidth = '',
  customHeight = '',
) {
  if (resolution === 'custom') {
    return normalizeCustomImageSize(customWidth, customHeight) || SIZE_BY_RATIO[aspectRatio];
  }
  if (resolution === '2K') {
    return GPT_IMAGE_2_2K_SIZE_BY_RATIO[aspectRatio] || scaleSize(SIZE_BY_RATIO[aspectRatio], '2K');
  }
  if (resolution === '4K') {
    return GPT_IMAGE_2_4K_SIZE_BY_RATIO[aspectRatio] || scaleSize(SIZE_BY_RATIO[aspectRatio], '4K');
  }
  return SIZE_BY_RATIO[aspectRatio];
}

export function inferImageAspectRatioFromSize(size: string): ImageAspectRatio {
  const normalized = String(size || '').trim().toLowerCase();
  const match = normalized.match(/^(\d+)x(\d+)$/u);
  if (!match) return '1:1';
  const width = Number(match[1]);
  const height = Number(match[2]);
  const target = width / height;
  return IMAGE_ASPECT_RATIO_OPTIONS
    .map((option) => {
      const [ratioWidth, ratioHeight] = option.value.split(':').map(Number);
      return { ratio: option.value, distance: Math.abs(ratioWidth / ratioHeight - target) };
    })
    .sort((left, right) => left.distance - right.distance)[0]?.ratio || '1:1';
}
