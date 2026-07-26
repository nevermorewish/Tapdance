import { useState } from 'react';
import type { Dispatch, ReactNode, SetStateAction } from 'react';
import type { ApiSettings, ModelSourceId } from '../../../types.ts';
import type { ModelInvocationLogEntry } from '../../../services/modelInvocationLog.ts';
import type { SeedanceHealth } from '../../fastVideoFlow/types/fastTypes.ts';
import type { MockApiServerStatus } from '../../../services/mockApiConfig.ts';
import type { ModelProviderId, ModelRole } from '../../../services/apiConfig.ts';
import { isNewApiAuthenticated } from '../../../services/newApiAuth.ts';
import { fetchNewApiBalance } from '../../../services/newApiAuth.ts';
import { BRAND } from '../../../config/brand.ts';

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
  const isAuthenticated = isNewApiAuthenticated(config);
  const [isRefreshingBalance, setIsRefreshingBalance] = useState(false);
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
    newapi: { ...previous.newapi, apiKey: '', user: null, tokens: [], selectedTokenId: null, balance: null },
    volcengine: { ...previous.volcengine, apiKey: '' },
    openai: { ...previous.openai, apiKey: '' },
  }));
  const refreshBalance = async () => {
    if (!isAuthenticated || isRefreshingBalance) return;
    setIsRefreshingBalance(true);
    try {
      const balance = await fetchNewApiBalance(config);
      setApiSettings((previous) => ({ ...previous, newapi: { ...previous.newapi, balance } }));
    } finally {
      setIsRefreshingBalance(false);
    }
  };
  const balanceLabel = config.balance
    ? config.balance.displayInCurrency
      ? `¥${(config.balance.quota / Math.max(1, config.balance.quotaPerUnit)).toFixed(2)}`
      : config.balance.quota.toLocaleString('zh-CN')
    : '暂无余额';

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
            <option value="doubao-seedance-2.0">doubao-seedance-2.0</option>
            <option value="doubao-seedance-2.0-fast">doubao-seedance-2.0-fast</option>
            <option value="doubao-seedance-2.0-mini">doubao-seedance-2.0-mini</option>
          </select></label>
        </div>
        <label className="mt-5 block text-sm text-zinc-300">NewAPI 令牌
          <select className="studio-input mt-2" value={config.selectedTokenId ?? ''} onChange={(event) => selectToken(Number(event.target.value))} disabled={config.tokens.length === 0}>
            {config.tokens.length === 0 ? <option value="">暂无可用令牌</option> : config.tokens.map((token) => <option key={token.id} value={token.id}>{token.name} · 分组：{token.group || 'default'}</option>)}
          </select>
          <span className="mt-1 block text-xs text-zinc-500">登录后默认选择 `default` 分组令牌；切换令牌会同时应用到文本、图片、视频和素材库。</span>
        </label>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          {isAuthenticated ? (
            <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-200">已连接：{config.user?.username}</span>
          ) : (
            <span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-xs text-amber-200">未登录 NewAPI</span>
          )}
          {isAuthenticated ? <button type="button" onClick={logout} className="studio-button studio-button-secondary px-4 py-2 text-xs">退出登录</button> : null}
          <button type="button" onClick={onRestoreDefaults} className="studio-button studio-button-secondary px-4 py-2 text-xs">恢复默认模型</button>
        </div>
      </div>

      <div className="rounded-3xl border border-emerald-400/15 bg-emerald-400/5 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-300">Account</div>
            <h2 className="mt-2 text-xl font-semibold text-white">账号与余额</h2>
            <p className="mt-2 text-sm text-zinc-400">注册、充值和余额信息使用当前品牌配置的服务地址。</p>
          </div>
          {isAuthenticated ? (
            <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-right">
              <div className="text-xs text-emerald-200">当前用户</div>
              <div className="mt-1 font-semibold text-white">{config.user?.displayName || config.user?.username || '已登录'}</div>
              {config.user?.displayName && config.user.displayName !== config.user.username ? <div className="text-xs text-emerald-100/70">@{config.user.username}</div> : null}
            </div>
          ) : null}
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-black/15 px-4 py-3">
            <div className="text-xs text-zinc-500">可用余额</div>
            <div className="mt-1 text-2xl font-semibold text-emerald-200">{balanceLabel}</div>
          </div>
          <button type="button" onClick={() => window.open(BRAND.registerUrl, '_blank', 'noopener,noreferrer')} className="studio-button studio-button-secondary justify-center">注册账号</button>
          <button type="button" onClick={() => window.open(BRAND.rechargeUrl, '_blank', 'noopener,noreferrer')} className="studio-button studio-button-primary justify-center">充值</button>
        </div>
        {isAuthenticated ? <button type="button" onClick={() => void refreshBalance()} disabled={isRefreshingBalance} className="mt-4 text-xs text-zinc-400 hover:text-white">{isRefreshingBalance ? '正在刷新余额…' : '刷新余额'}</button> : <div className="mt-4 text-xs text-zinc-500">登录后显示用户名和实时余额。</div>}
      </div>

      <div className="rounded-3xl border border-cyan-400/15 bg-cyan-400/5 p-6 text-sm leading-7 text-zinc-300">
        <div className="font-semibold text-white">统一调用路径</div>
        <div className="mt-2">文本：<code>/v1/chat/completions</code>　图片：<code>/v1/images/generations</code> / <code>/v1/images/edits</code>　视频：<code>/api/v3/contents/generations/tasks</code></div>
        <div>素材库：<code>/api/material</code>（按当前 NewAPI 账号隔离）</div>
      </div>
    </section>
  );
}
