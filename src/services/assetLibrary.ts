import { loadApiSettings } from './apiConfig.ts';
import { buildSeedanceBridgeRequestUrl, resolveSeedanceBridgeUrl } from './seedanceBridgeUrl.ts';

export type AssetLibraryConfig = { rootPath: string; defaultRootPath: string; usingDefaultPath: boolean };
export type AssetLibrarySavedFile = { rootPath: string; relativePath: string; absolutePath: string; fileName: string; kind: 'image' | 'video'; url: string };
export type AssetLibraryCopiedFile = { relativePath: string; destinationPath: string; fileName: string };

function getBaseUrl() {
  return loadApiSettings().newapi.baseUrl.replace(/\/$/u, '');
}

async function materialRequest<T>(action: string, body: Record<string, unknown>): Promise<T> {
  const settings = loadApiSettings();
  const key = settings.newapi.apiKey.trim();
  if (!key) throw new Error('请先登录寰星云科 API。');
  const response = await fetch(`${getBaseUrl()}/api/material?Action=${encodeURIComponent(action)}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  let payload: any = {};
  try { payload = text ? JSON.parse(text) : {}; } catch { payload = { message: text }; }
  if (!response.ok || payload?.error || payload?.success === false || payload?.ResponseMetadata?.Error) throw new Error(payload?.error?.message || payload?.message || payload?.ResponseMetadata?.Error?.Message || `素材库请求失败 (${response.status})`);
  return payload as T;
}

function resultItems(payload: any, names: string[]) {
  for (const name of names) {
    const value = payload?.Result?.[name] ?? payload?.result?.[name] ?? payload?.data?.[name];
    if (Array.isArray(value)) return value;
  }
  return Array.isArray(payload?.Result) ? payload.Result : Array.isArray(payload?.data) ? payload.data : [];
}

export async function fetchAssetLibraryConfig(_baseUrl?: string) {
  try {
    const payload = await materialRequest<any>('ListAssetGroups', { PageNumber: 1, PageSize: 100, Filter: { GroupType: 'AIGC' }, ProjectName: 'default' });
    const groups = resultItems(payload, ['Items', 'Groups', 'AssetGroups']);
    return { rootPath: `寰星素材库（${groups.length} 个分组）`, defaultRootPath: '寰星素材库', usingDefaultPath: true } satisfies AssetLibraryConfig;
  } catch {
    return { rootPath: '寰星素材库', defaultRootPath: '寰星素材库', usingDefaultPath: true } satisfies AssetLibraryConfig;
  }
}

export async function updateAssetLibraryConfig(_params?: { rootPath?: string; migrateExistingFiles?: boolean; baseUrl?: string }) {
  return fetchAssetLibraryConfig();
}

export async function copyAssetLibraryFilesToDownloads(_params?: { relativePaths: string[]; baseUrl?: string }) {
  return { downloadsDir: '', copiedFiles: [] } satisfies { downloadsDir: string; copiedFiles: AssetLibraryCopiedFile[] };
}

function assertPublicUrl(value: string) {
  if (!/^https?:\/\//iu.test(value)) throw new Error('寰星素材库要求图片或视频是公网 URL；请先完成生成后再保存。');
}

export async function saveMediaToAssetLibrary(params: {
  sourceUrl: string; kind: 'image' | 'video'; assetId: string; title: string; groupName: string; projectName: string; fileNameHint?: string; baseUrl?: string;
}) {
  const sourceUrl = String(params.sourceUrl || '').trim();
  // Keep the old local bridge only for loopback test/mock servers. Production
  // asset persistence always uses Huanxing's tenant-scoped material API below.
  const legacyLocalBridge = /^https?:\/\/(?:127\.0\.0\.1|localhost)(?::\d+)?\/api\/seedance(?:$|\/)/iu.test(params.baseUrl?.trim() || '');
  if (legacyLocalBridge) {
    const response = await fetch(buildSeedanceBridgeRequestUrl('/assets/save', params.baseUrl), {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sourceUrl: resolveSeedanceBridgeUrl(sourceUrl, params.baseUrl), kind: params.kind, assetId: params.assetId, title: params.title, groupName: params.groupName, projectName: params.projectName, fileName: params.fileNameHint || '' }),
    });
    const text = await response.text();
    const payload = text ? JSON.parse(text) : {};
    if (!response.ok) throw new Error(payload?.error || payload?.message || `资产库请求失败 (${response.status})`);
    return { ...payload, url: resolveSeedanceBridgeUrl(payload.url, params.baseUrl) } as AssetLibrarySavedFile;
  }
  assertPublicUrl(sourceUrl);
  const groupName = params.groupName.trim() || 'Tapdance';
  const groupPayload = await materialRequest<any>('ListAssetGroups', { PageNumber: 1, PageSize: 100, Filter: { GroupType: 'AIGC', Name: groupName }, ProjectName: params.projectName.trim() || 'default' });
  let groups = resultItems(groupPayload, ['Items', 'Groups', 'AssetGroups']);
  let group = groups.find((item: any) => String(item?.Name || item?.name || '') === groupName);
  if (!group?.Id && !group?.id) {
    const created = await materialRequest<any>('CreateAssetGroup', { Name: groupName, Description: `Tapdance ${params.projectName || '项目'} 素材`, GroupType: 'AIGC', ProjectName: params.projectName.trim() || 'default' });
    group = created?.Result || created?.data || {};
  }
  const groupId = String(group?.Id || group?.id || '').trim();
  if (!groupId) throw new Error('寰星 API 未返回素材分组 ID。');
  const createdAsset = await materialRequest<any>('CreateAsset', { GroupId: groupId, URL: sourceUrl, AssetType: params.kind === 'image' ? 'Image' : 'Video', Name: params.title.trim() || params.assetId, ProjectName: params.projectName.trim() || 'default' });
  const asset = createdAsset?.Result || createdAsset?.data || {};
  const assetId = String(asset?.Id || asset?.id || params.assetId);
  return { rootPath: '寰星素材库', relativePath: `asset://${assetId}`, absolutePath: groupId, fileName: params.fileNameHint || params.title, kind: params.kind, url: sourceUrl } satisfies AssetLibrarySavedFile;
}

export function isAssetLibraryUrl(url?: string) { return String(url || '').startsWith('asset://'); }
export function getAssetLibraryRelativePath(url?: string) { return String(url || '').startsWith('asset://') ? String(url) : ''; }
