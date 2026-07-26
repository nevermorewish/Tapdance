import test from 'node:test';
import assert from 'node:assert/strict';

import {
  normalizeCustomImageSize,
  resolveImageGenerationSize,
} from '../src/features/imageCreation/utils/imageGenerationSizing.ts';

test('image generation sizing matches ImageHub ratio and resolution presets', () => {
  assert.equal(resolveImageGenerationSize('16:9', '1K'), '1792x1024');
  assert.equal(resolveImageGenerationSize('16:9', '2K'), '2048x1152');
  assert.equal(resolveImageGenerationSize('16:9', '4K'), '3840x2160');
  assert.equal(resolveImageGenerationSize('4:5', '2K'), '1792x2240');
});

test('custom image size is clamped to ImageHub limits', () => {
  assert.equal(normalizeCustomImageSize('1920', '1080'), '1920x1080');
  assert.equal(normalizeCustomImageSize('20', '5000'), '64x3840');
  assert.equal(resolveImageGenerationSize('1:1', 'custom', '1920', '1080'), '1920x1080');
});
