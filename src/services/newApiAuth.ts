import type { NewApiBalance, NewApiConfig, NewApiToken, NewApiUser } from '../types.ts';
import { buildSeedanceBridgeRequestUrl } from './seedanceBridgeUrl.ts';

export type NewApiAuthResult = { apiKey: string; user: NewApiUser; tokens: NewApiToken[]; selectedTokenId: number | null };

export function isNewApiAuthenticated(config: Pick<NewApiConfig, 'apiKey' | 'user' | 'tokens' | 'selectedTokenId'>) {
  const apiKey = String(config.apiKey || '').trim();
  const userId = Number(config.user?.id);
  if (!apiKey || !Number.isFinite(userId) || userId <= 0 || !Array.isArray(config.tokens) || config.tokens.length === 0) {
    return false;
  }

  const selectedToken = config.tokens.find((token) => token.id === config.selectedTokenId);
  return Boolean(
    selectedToken
    && selectedToken.status !== 0
    && String(selectedToken.key || '').trim() === apiKey,
  );
}

async function request<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(buildSeedanceBridgeRequestUrl(path), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  let payload: any = {};
  try { payload = text ? JSON.parse(text) : {}; } catch { payload = { message: text }; }
  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.message || payload?.error || `NewAPI 请求失败 (${response.status})`);
  }
  return payload as T;
}

export async function loginToNewApi(config: Pick<NewApiConfig, 'baseUrl'>, username: string, password: string, turnstile = '') {
  const result = await request<{ data: NewApiAuthResult }>('/newapi/login', {
    baseUrl: config.baseUrl, username, password, turnstile,
  });
  return result.data;
}

export async function registerNewApi(config: Pick<NewApiConfig, 'baseUrl'>, payload: {
  username: string; password: string; email?: string; verificationCode?: string; turnstile?: string;
}) {
  await request('/newapi/register', { baseUrl: config.baseUrl, ...payload });
}

export async function fetchNewApiBalance(config: Pick<NewApiConfig, 'baseUrl'>): Promise<NewApiBalance> {
  const result = await request<{ data?: { quota?: number; used_quota?: number }; status?: { quota_per_unit?: number; display_in_currency?: boolean } }>('/newapi/balance', {
    baseUrl: config.baseUrl,
  });
  const data = result.data || {};
  const status = result.status || {};
  return {
    quota: Number(data.quota || 0),
    usedQuota: Number(data.used_quota || 0),
    quotaPerUnit: Number(status.quota_per_unit || 500000),
    displayInCurrency: status.display_in_currency !== false,
  };
}

export async function logoutNewApi(baseUrl: string) {
  await request('/newapi/logout', { baseUrl });
}

export function applyNewApiAuth(settings: any, result: NewApiAuthResult) {
  const newapi = {
    ...settings.newapi,
    apiKey: result.apiKey,
    user: result.user,
    balance: null,
    tokens: result.tokens || [],
    selectedTokenId: result.selectedTokenId ?? null,
  };
  return {
    ...settings,
    newapi,
    volcengine: { ...settings.volcengine, apiKey: result.apiKey, textModel: newapi.textModel, videoModel: newapi.videoModel },
    openai: { ...settings.openai, apiKey: result.apiKey, imageModel: newapi.imageModel },
    seedance: { ...settings.seedance, enabled: true, defaultExecutor: 'ark', apiModel: newapi.videoModel, fastApiModel: newapi.videoModel },
    defaultModels: { text: 'volcengine.textModel', image: 'openai.imageModel', video: 'volcengine.videoModel' },
  };
}
