import type { Dispatch, ReactNode, SetStateAction } from 'react';
import type { ApiSettings, ModelSourceId } from '../../../types.ts';
import type { ModelInvocationLogEntry } from '../../../services/modelInvocationLog.ts';
import type { SeedanceHealth } from '../../fastVideoFlow/types/fastTypes.ts';
import type { MockApiServerStatus } from '../../../services/mockApiConfig.ts';
import type { ModelProviderId, ModelRole } from '../../../services/apiConfig.ts';

type Props = {
  apiSettings: ApiSettings;
  setApiSettings: Dispatch<SetStateAction<ApiSettings>>;
  seedanceHealth: SeedanceHealth | null;
  renderSeedanceHealthPanel: () => ReactNode;
  usdToCnyRate: number;
  modelInvocationLogs: ModelInvocationLogEntry[];
  onRestoreDefaults: () => void;
  mockApiStatus: MockApiServerStatus;
  isMockApiBusy: boolean;
  onStartMockApi: (scenario: ApiSettings['mockApi']['scenario']) => void | Promise<void>;
  onStopMockApi: () => void | Promise<void>;
  onRefreshMockApiStatus: () => void | Promise<void>;
  onInitializeDatabase: () => void | Promise<void>;
  isInitializingDatabase: boolean;
  getSourceProviderKey: (sourceId: ModelSourceId) => ModelProviderId;
  getGeminiRoleModelOptions: (role: ModelRole) => Array<{ value: string; sourceId: ModelSourceId; modelName: string; label: string }>;
  getVolcengineRoleModelOptions: (role: ModelRole) => Array<{ value: string; label: string }>;
  getOpenAIRoleModelOptions: (role: ModelRole) => Array<{ value: string; label: string }>;
  getAliyunRoleModelOptions: (role: ModelRole) => Array<{ value: string; label: string }>;
  getProviderRoleCatalogOptions: (apiSettings: ApiSettings, providerId: ModelProviderId, role: ModelRole, configuredValue: string) => Array<{ value: string; label: string }>;
  updateGeminiRoleModel: (role: ModelRole, modelId: string) => void;
};

export function ApiConfigPage({ apiSettings, setApiSettings, onRestoreDefaults }: Props) {
  const config = apiSettings.newapi;
  const update = (patch: Partial<typeof config>) => setApiSettings((previous) => {
    const next = { ...previous.newapi, ...patch };
    return {
      ...previous,
      newapi: next,
      volcengine: { ...previous.volcengine, textModel: next.textModel, videoModel: next.videoModel },
      openai: { ...previous.openai, imageModel: next.imageModel },
      seedance: { ...previous.seedance, apiModel: next.videoModel, fastApiModel: next.videoModel, defaultExecutor: 'ark' },
    };
  });
  const selectToken = (tokenId: number) => setApiSettings((previous) => {
    const token = previous.newapi.tokens.find((item) => item.id === tokenId);
    if (!token) return previous;
    return {
      ...previous,
      newapi: { ...previous.newapi, selectedTokenId: token.id, apiKey: token.key },
      volcengine: { ...previous.volcengine, apiKey: token.key },
      openai: { ...previous.openai, apiKey: token.key },
    };
  });
  const logout = () => setApiSettings((previous) => ({
    ...previous,
    newapi: { ...previous.newapi, apiKey: '', user: null, tokens: [], selectedTokenId: null },
    volcengine: { ...previous.volcengine, apiKey: '' },
    openai: { ...previous.openai, apiKey: '' },
  }));

  return (
    <section className="mx-auto max-w-4xl space-y-6 py-8">
      <div>
        <div className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-300">Connection</div>
        <h1 className="mt-3 text-3xl font-semibold text-white">NewAPI 连接配置</h1>
        <p className="mt-2 text-sm text-zinc-400">当前应用只保留一个 NewAPI 连接。文本、图片、视频和素材库都会使用此账号。</p>
      </div>

      <div className="rounded-3xl border border-white/10 bg-zinc-950/60 p-6">
        <label className="block text-sm text-zinc-300">NewAPI 地址<input className="studio-input mt-2" value={config.baseUrl} onChange={(event) => update({ baseUrl: event.target.value })} /></label>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <label className="block text-sm text-zinc-300">文本模型<input className="studio-input mt-2" value={config.textModel} placeholder="gpt-5.6-sol" onChange={(event) => update({ textModel: event.target.value })} /></label>
          <label className="block text-sm text-zinc-300">生图模型<input className="studio-input mt-2" value={config.imageModel} placeholder="gpt-image-2" onChange={(event) => update({ imageModel: event.target.value })} /></label>
          <label className="block text-sm text-zinc-300">视频模型<select className="studio-input mt-2" value={config.videoModel} onChange={(event) => update({ videoModel: event.target.value })}>
            <option value="doubao-seedance-2.0">doubao-seedance-2.0（标准）</option>
            <option value="doubao-seedance-2.0-fast">doubao-seedance-2.0-fast（快速）</option>
            <option value="doubao-seedance-2.0-mini">doubao-seedance-2.0-mini（轻量）</option>
          </select></label>
        </div>
        <label className="mt-5 block text-sm text-zinc-300">NewAPI 令牌
          <select className="studio-input mt-2" value={config.selectedTokenId ?? ''} onChange={(event) => selectToken(Number(event.target.value))} disabled={config.tokens.length === 0}>
            {config.tokens.length === 0 ? <option value="">暂无可用令牌</option> : config.tokens.map((token) => <option key={token.id} value={token.id}>{token.name} · 分组：{token.group || 'default'}</option>)}
          </select>
          <span className="mt-1 block text-xs text-zinc-500">登录后默认选择 `default` 分组令牌；切换令牌会同时应用到文本、图片、视频和素材库。</span>
        </label>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-200">已连接：{config.user?.username || 'NewAPI 用户'}</span>
          <button type="button" onClick={logout} className="studio-button studio-button-secondary px-4 py-2 text-xs">退出登录</button>
          <button type="button" onClick={onRestoreDefaults} className="studio-button studio-button-secondary px-4 py-2 text-xs">恢复默认模型</button>
        </div>
      </div>

      <div className="rounded-3xl border border-cyan-400/15 bg-cyan-400/5 p-6 text-sm leading-7 text-zinc-300">
        <div className="font-semibold text-white">统一调用路径</div>
        <div className="mt-2">文本：<code>/v1/chat/completions</code>　图片：<code>/v1/images/generations</code> / <code>/v1/images/edits</code>　视频：<code>/api/v3/contents/generations/tasks</code></div>
        <div>素材库：<code>/api/material</code>（按当前 NewAPI 账号隔离）</div>
      </div>
    </section>
  );
}
