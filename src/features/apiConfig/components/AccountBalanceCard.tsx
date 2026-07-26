import { useEffect, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { Check, ChevronDown, LogOut, Moon, RefreshCw, Sun, Upload } from 'lucide-react';

import type { ApiSettings } from '../../../types.ts';
import { fetchNewApiBalance, isNewApiAuthenticated } from '../../../services/newApiAuth.ts';
import { BRAND } from '../../../config/brand.ts';

type Props = {
  apiSettings: ApiSettings;
  setApiSettings: Dispatch<SetStateAction<ApiSettings>>;
  themeMode: 'light' | 'dark';
  onThemeModeChange: (mode: 'light' | 'dark') => void;
};

export function AccountBalanceCard({ apiSettings, setApiSettings, themeMode, onThemeModeChange }: Props) {
  const config = apiSettings.newapi;
  const isAuthenticated = isNewApiAuthenticated(config);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isMenuOpen) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setIsMenuOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsMenuOpen(false);
    };
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMenuOpen]);

  const refreshBalance = async () => {
    if (!isAuthenticated || isRefreshing) return;
    setIsRefreshing(true);
    try {
      const balance = await fetchNewApiBalance(config);
      setApiSettings((previous) => ({ ...previous, newapi: { ...previous.newapi, balance } }));
    } finally {
      setIsRefreshing(false);
    }
  };

  const logout = () => {
    setIsMenuOpen(false);
    setApiSettings((previous) => ({
      ...previous,
      newapi: { ...previous.newapi, apiKey: '', user: null, tokens: [], selectedTokenId: null, balance: null },
      volcengine: { ...previous.volcengine, apiKey: '' },
      openai: { ...previous.openai, apiKey: '' },
    }));
  };

  const checkForUpdates = () => {
    setIsMenuOpen(false);
    if (typeof window !== 'undefined' && window.electronAPI?.isElectron) void window.electronAPI.checkForUpdates();
  };

  const balanceLabel = config.balance
    ? config.balance.displayInCurrency
      ? `¥${(config.balance.quota / Math.max(1, config.balance.quotaPerUnit)).toFixed(2)}`
      : config.balance.quota.toLocaleString('zh-CN')
    : '暂无余额';

  return (
    <div ref={menuRef} className="relative rounded-2xl border border-emerald-400/15 bg-emerald-400/5 p-3">
      <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-emerald-300">Account</div>
      {isAuthenticated ? (
        <>
          <button
            type="button"
            className="mt-2 flex w-full items-center justify-between gap-2 rounded-lg text-left text-sm font-semibold text-white transition-colors hover:text-emerald-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/60"
            title={config.user?.username || ''}
            aria-haspopup="menu"
            aria-expanded={isMenuOpen}
            onClick={() => setIsMenuOpen((open) => !open)}
          >
            <span className="min-w-0 truncate">{config.user?.displayName || config.user?.username || '已登录'}</span>
            <ChevronDown className={`h-4 w-4 shrink-0 text-emerald-200/70 transition-transform ${isMenuOpen ? 'rotate-180' : ''}`} />
          </button>
          {config.user?.displayName && config.user.displayName !== config.user.username ? <div className="mt-0.5 truncate text-[11px] text-emerald-100/70">@{config.user.username}</div> : null}
          <div className="mt-3 text-[11px] text-zinc-500">可用余额</div>
          <div className="mt-1 text-xl font-semibold text-emerald-200">{balanceLabel}</div>
          <div className="mt-3 flex items-center gap-2">
            <button type="button" onClick={() => void refreshBalance()} disabled={isRefreshing} className="inline-flex items-center gap-1 text-[11px] text-zinc-400 hover:text-white disabled:opacity-50"><RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />{isRefreshing ? '刷新中…' : '刷新余额'}</button>
            <button type="button" onClick={() => window.open(BRAND.rechargeUrl, '_blank', 'noopener,noreferrer')} className="text-[11px] text-emerald-300 hover:text-emerald-200">充值</button>
          </div>
          {isMenuOpen ? (
            <div role="menu" className="absolute bottom-full left-0 right-0 z-50 mb-2 overflow-hidden rounded-xl border border-white/15 bg-slate-950/95 p-1.5 shadow-2xl shadow-black/40 backdrop-blur">
              <div className="px-2.5 pb-1.5 pt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">外观设置</div>
              <div className="grid grid-cols-2 gap-1 px-1 pb-1.5">
                <button type="button" role="menuitem" onClick={() => onThemeModeChange('light')} className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-xs transition-colors ${themeMode === 'light' ? 'bg-emerald-400/15 text-emerald-100' : 'text-zinc-400 hover:bg-white/10 hover:text-white'}`}><Sun className="h-3.5 w-3.5" />浅色{themeMode === 'light' ? <Check className="h-3 w-3" /> : null}</button>
                <button type="button" role="menuitem" onClick={() => onThemeModeChange('dark')} className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-xs transition-colors ${themeMode === 'dark' ? 'bg-emerald-400/15 text-emerald-100' : 'text-zinc-400 hover:bg-white/10 hover:text-white'}`}><Moon className="h-3.5 w-3.5" />深色{themeMode === 'dark' ? <Check className="h-3 w-3" /> : null}</button>
              </div>
              <button type="button" role="menuitem" onClick={checkForUpdates} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs text-zinc-300 transition-colors hover:bg-white/10 hover:text-white"><Upload className="h-3.5 w-3.5" />检查更新</button>
              <button type="button" role="menuitem" onClick={logout} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs text-rose-300 transition-colors hover:bg-rose-400/10 hover:text-rose-200"><LogOut className="h-3.5 w-3.5" />退出登录</button>
            </div>
          ) : null}
        </>
      ) : (
        <>
          <div className="mt-2 text-xs text-zinc-500">未登录 NewAPI</div>
          <button type="button" onClick={() => window.open(BRAND.registerUrl, '_blank', 'noopener,noreferrer')} className="mt-3 text-[11px] text-cyan-300 hover:text-cyan-200">注册账号</button>
        </>
      )}
    </div>
  );
}
