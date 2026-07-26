import type { OpenAIImageOutputFormat, OpenAIImageQuality, OpenAIImageModeration } from '../../services/openaiImageService.ts';
import type { ImageAspectRatio, ImageResolution } from './utils/imageGenerationSizing.ts';

export type ImageCreationReference = {
  id: string;
  title: string;
  sourceUrl: string;
  fileName?: string;
};

export type ImageCreationOutput = {
  id: string;
  title: string;
  url: string;
  savedRelativePath: string;
  createdAt: string;
};

export type ImageCreationRecord = {
  id: string;
  groupId: string;
  groupName: string;
  title: string;
  prompt: string;
  provider: 'openai';
  model: string;
  createdAt: string;
  request: {
    aspectRatio?: ImageAspectRatio;
    resolution?: ImageResolution;
    customWidth?: string;
    customHeight?: string;
    size: string;
    quality: OpenAIImageQuality;
    outputFormat: OpenAIImageOutputFormat;
    outputCompression?: number;
    moderation: OpenAIImageModeration;
    n: number;
    referenceImageUrls: string[];
  };
  outputs: ImageCreationOutput[];
};

export type ImageCreationDraft = {
  title: string;
  groupMode: 'existing' | 'new';
  existingGroupId: string;
  newGroupName: string;
  prompt: string;
  aspectRatio: ImageAspectRatio;
  resolution: ImageResolution;
  customWidth: string;
  customHeight: string;
  size: string;
  quality: OpenAIImageQuality;
  outputFormat: OpenAIImageOutputFormat;
  outputCompression: number;
  moderation: OpenAIImageModeration;
  n: number;
  references: ImageCreationReference[];
};

export type ImageCreationGroupOption = {
  id: string;
  name: string;
};

/** Synthetic picker value used by the image task list to show every group. */
export const ALL_IMAGE_CREATION_GROUP_ID = '__all_image_creation_tasks__';
