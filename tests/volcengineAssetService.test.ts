import test from 'node:test';
import assert from 'node:assert/strict';

import { extractArkAssetId } from '../src/services/volcengineAssetService.ts';

test('extractArkAssetId accepts common Ark and Huanxing response shapes', () => {
  assert.equal(extractArkAssetId({ Id: 'asset-1' }), 'asset-1');
  assert.equal(extractArkAssetId({ AssetId: 'asset-2' }), 'asset-2');
  assert.equal(extractArkAssetId({ data: { asset_id: 'asset-3' } }), 'asset-3');
  assert.equal(extractArkAssetId({ Result: { Asset: { id: 'asset-4' } } }), 'asset-4');
  assert.equal(extractArkAssetId({ ResponseMetadata: { RequestId: 'request-1' } }), '');
});
