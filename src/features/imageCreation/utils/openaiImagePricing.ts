import type { OpenAIImageOutputFormat, OpenAIImageQuality } from '../../../services/openaiImageService.ts';

export const OPENAI_IMAGE_QUALITY_OPTIONS: Array<{ value: OpenAIImageQuality; label: string }> = [
  { value: 'auto', label: 'Auto' },
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

export const OPENAI_IMAGE_OUTPUT_FORMAT_OPTIONS: Array<{ value: OpenAIImageOutputFormat; label: string }> = [
  { value: 'png', label: 'PNG' },
  { value: 'jpeg', label: 'JPEG' },
  { value: 'webp', label: 'WebP' },
];
