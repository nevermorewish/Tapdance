import { loadApiSettings } from '../../../services/apiConfig.ts';
import { ensureInlineImageDataUrl } from '../../../services/requestBuilders.ts';
import { compileSeedanceRequest } from './seedanceDraft.ts';
import type { SeedanceApiModelKey, SeedanceApiTask, SeedanceDraft } from '../types.ts';

function getVolcengineConfig() {
  return loadApiSettings().volcengine;
}

function getSeedanceConfig() {
  return loadApiSettings().seedance;
}

function getBaseUrl(path: string) {
  const settings = loadApiSettings();
  if (settings.mockApi.enabled && settings.volcengine.baseUrl) {
    return settings.volcengine.baseUrl.replace(/\/$/u, '');
  }
  return `${settings.newapi.baseUrl.replace(/\/$/u, '')}/api/v3`;
}

function getHeaders() {
  const apiKey = loadApiSettings().newapi.apiKey.trim() || getVolcengineConfig().apiKey.trim();
  if (!apiKey) {
    throw new Error('NewAPI 未登录，请先登录 NewAPI。');
  }

  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
  };
}

function resolveHuanxingVideoModel(modelId: string, modelKey: SeedanceApiModelKey): string {
  const normalized = modelId.trim().toLowerCase();
  if (!normalized || normalized === 'seedance') {
    return modelKey === 'fast' ? 'doubao-seedance-2.0-fast' : 'doubao-seedance-2.0';
  }
  if (normalized === 'seedance-fast' || normalized === 'seedance2.0fast') {
    return 'doubao-seedance-2.0-fast';
  }
  if (normalized === 'seedance-mini' || normalized === 'seedance2.0mini') {
    return 'doubao-seedance-2.0-mini';
  }
  return modelId.trim();
}

async function requestJson(path: string, init: RequestInit) {
  const response = await fetch(`${getBaseUrl(path)}${path}`, {
    ...init,
    headers: {
      ...getHeaders(),
      ...(init.headers || {}),
    },
  });

  const text = await response.text();
  let payload: Record<string, any> = {};

  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = { rawText: text };
    }
  }

  if (!response.ok) {
    const message = payload?.error?.message || payload?.message || text || `HTTP ${response.status}`;
    throw new Error(`Seedance API 请求失败: ${message}`);
  }

  return payload;
}

function resolveModelId(modelKey: SeedanceApiModelKey) {
  const config = getSeedanceConfig();
  const modelId = (modelKey === 'fast' ? config.fastApiModel : config.apiModel).trim();
  if (!modelId) {
    throw new Error(modelKey === 'fast' ? '未配置 Seedance 2.0 Fast API 模型 / 接入点。' : '未配置 Seedance 2.0 API 模型 / 接入点。');
  }
  return modelId;
}

function mapTask(payload: Record<string, any>): SeedanceApiTask {
  const data = payload?.data && typeof payload.data === 'object' ? payload.data : payload;
  const content = data?.content && typeof data.content === 'object' ? data.content : {};
  return {
    id: String(data.id || data.task_id || '').trim(),
    status: String(data.status || '').trim(),
    model: typeof data.model === 'string' ? data.model : '',
    videoUrl: content.video_url || content.videoUrl || '',
    lastFrameUrl: content.last_frame_url || content.lastFrameUrl || '',
    createdAt: typeof data.created_at === 'number' ? data.created_at : undefined,
    updatedAt: typeof data.updated_at === 'number' ? data.updated_at : undefined,
    ratio: typeof data.ratio === 'string' ? data.ratio : '',
    resolution: typeof data.resolution === 'string' ? data.resolution : '',
    duration: typeof data.duration === 'number' ? data.duration : undefined,
    error: data?.error || null,
    raw: payload,
  };
}

function isAssetServiceUrl(url: string) {
  return url.startsWith('asset://');
}

function isInlineDataUrl(url: string) {
  return url.startsWith('data:');
}

function isRemoteHttpUrl(url: string) {
  return /^https?:\/\//iu.test(url);
}

async function normalizeDraftForApi(draft: SeedanceDraft): Promise<SeedanceDraft> {
  const assets = await Promise.all(draft.assets.map(async (asset) => {
    const urlOrData = (asset.urlOrData || '').trim();
    if (!urlOrData || isAssetServiceUrl(urlOrData) || isInlineDataUrl(urlOrData)) {
      return asset;
    }

    if (asset.kind === 'image') {
      return {
        ...asset,
        urlOrData: await ensureInlineImageDataUrl(urlOrData) || urlOrData,
      };
    }

    if (urlOrData.startsWith('blob:')) {
      throw new Error(asset.kind === 'video'
        ? '当前 Ark Seedance API 不支持直接提交浏览器本地 blob 视频，请改用公网 URL。'
        : '当前 Ark Seedance API 不支持直接提交浏览器本地 blob 音频，请改用公网 URL。');
    }

    if (!isRemoteHttpUrl(urlOrData)) {
      throw new Error(asset.kind === 'video'
        ? '当前 Ark Seedance API 不支持直接提交本地视频地址，请改用公网 URL。'
        : '当前 Ark Seedance API 不支持直接提交本地音频地址，请改用公网 URL。');
    }

    return asset;
  }));

  return {
    ...draft,
    assets,
  };
}

export async function createSeedanceTask(draft: SeedanceDraft, modelKey: SeedanceApiModelKey = 'standard'): Promise<SeedanceApiTask> {
  const normalizedDraft = await normalizeDraftForApi(draft);
  const compiled = compileSeedanceRequest(normalizedDraft);
  const payload = await requestJson('/contents/generations/tasks', {
    method: 'POST',
    body: JSON.stringify({
      model: resolveHuanxingVideoModel(resolveModelId(modelKey), modelKey),
      content: compiled.content,
      resolution: compiled.resolution,
      ratio: compiled.ratio,
      duration: compiled.duration,
      generate_audio: compiled.generateAudio,
      return_last_frame: compiled.returnLastFrame,
      watermark: compiled.watermark,
      ...(compiled.safetyIdentifier ? { safety_identifier: compiled.safetyIdentifier } : {}),
      ...(compiled.tools ? { tools: compiled.tools } : {}),
    }),
  });

  return mapTask(payload);
}

export async function getSeedanceTask(taskId: string): Promise<SeedanceApiTask> {
  const normalizedTaskId = taskId.trim();
  if (!normalizedTaskId) {
    throw new Error('任务 ID 不能为空。');
  }

  const payload = await requestJson(`/contents/generations/tasks/${encodeURIComponent(normalizedTaskId)}`, {
    method: 'GET',
  });

  return mapTask(payload);
}

export async function listSeedanceTasks(filters?: {
  pageNum?: number;
  pageSize?: number;
  status?: string;
  taskIds?: string[];
  model?: string;
}) {
  const params = new URLSearchParams();

  if (typeof filters?.pageNum === 'number') {
    params.set('page_num', String(filters.pageNum));
  }
  if (typeof filters?.pageSize === 'number') {
    params.set('page_size', String(filters.pageSize));
  }
  if (filters?.status?.trim()) {
    params.set('filter.status', filters.status.trim());
  }
  if (filters?.model?.trim()) {
    params.set('filter.model', filters.model.trim());
  }
  for (const taskId of filters?.taskIds || []) {
    const normalizedTaskId = taskId.trim();
    if (normalizedTaskId) {
      params.append('filter.task_ids', normalizedTaskId);
    }
  }

  const queryString = params.toString();
  const payload = await requestJson(`/contents/generations/tasks${queryString ? `?${queryString}` : ''}`, {
    method: 'GET',
  });

  return {
    items: Array.isArray(payload.items) ? payload.items.map((item: Record<string, any>) => mapTask(item)) : [],
    raw: payload,
  };
}

export async function deleteSeedanceTask(taskId: string): Promise<void> {
  const normalizedTaskId = taskId.trim();
  if (!normalizedTaskId) {
    throw new Error('任务 ID 不能为空。');
  }

  await requestJson(`/contents/generations/tasks/${encodeURIComponent(normalizedTaskId)}`, {
    method: 'DELETE',
  });
}
