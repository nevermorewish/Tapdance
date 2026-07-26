import type { NewApiConfig, NewApiToken, NewApiUser } from '../types.ts';
import { buildSeedanceBridgeRequestUrl } from './seedanceBridgeUrl.ts';

export type NewApiAuthResult = { apiKey: string; user: NewApiUser; tokens: NewApiToken[]; selectedTokenId: number | null };

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

export async function logoutNewApi(baseUrl: string) {
  await request('/newapi/logout', { baseUrl });
}

export function applyNewApiAuth(settings: any, result: NewApiAuthResult) {
  const newapi = {
    ...settings.newapi,
    apiKey: result.apiKey,
    user: result.user,
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
