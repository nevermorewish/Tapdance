import { useEffect, useState } from 'react';
import type { UpdateStatus } from '../../electron/main/updater.ts';

export function UpdateNotifier() {
  const [update, setUpdate] = useState<UpdateStatus>({ status: 'idle' });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.electronAPI?.isElectron) return;

    let active = true;
    const unsubscribe = window.electronAPI.onUpdateStatusChanged((status) => {
      if (active) setUpdate(status);
    });
    void window.electronAPI.getUpdateStatus().then((status) => {
      if (active) setUpdate(status);
    }).catch(() => undefined);

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const download = async () => {
    setBusy(true);
    try {
      await window.electronAPI.downloadUpdate();
    } finally {
      setBusy(false);
    }
  };

  const check = async () => {
    setBusy(true);
    try {
      await window.electronAPI.checkForUpdates();
    } finally {
      setBusy(false);
    }
  };

  const install = async () => {
    setBusy(true);
    try {
      await window.electronAPI.installUpdate();
    } finally {
      setBusy(false);
    }
  };

  if (update.status === 'idle' || update.status === 'checking' || update.status === 'not-available') {
    return null;
  }

  if (update.status === 'error') {
    return (
      <div className="fixed right-5 top-5 z-[100] w-[min(360px,calc(100vw-2.5rem))] rounded-2xl border border-amber-300/20 bg-slate-950/95 p-4 text-sm text-slate-100 shadow-2xl backdrop-blur">
        <p className="font-semibold">更新检查失败</p>
        <p className="mt-1 line-clamp-2 text-xs text-slate-400">{update.error || '请稍后重试'}</p>
        <button type="button" className="mt-3 rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold disabled:opacity-50" disabled={busy} onClick={() => void check()}>
          {busy ? '正在检查…' : '重新检查'}
        </button>
      </div>
    );
  }

  const version = update.info?.version || '最新版本';
  const progress = Math.max(0, Math.min(100, Number(update.progress?.percent || 0)));

  return (
    <div className="fixed right-5 top-5 z-[100] w-[min(360px,calc(100vw-2.5rem))] rounded-2xl border border-cyan-300/20 bg-slate-950/95 p-4 text-sm text-slate-100 shadow-2xl shadow-cyan-950/40 backdrop-blur">
      {update.status === 'available' ? (
        <>
          <p className="font-semibold">发现新版本 v{version}</p>
          <p className="mt-1 text-xs text-slate-400">更新文件来自火山云 TOS。</p>
          <button type="button" className="mt-3 rounded-lg bg-cyan-400 px-3 py-2 text-xs font-semibold text-slate-950 disabled:opacity-50" disabled={busy} onClick={() => void download()}>
            {busy ? '正在准备…' : '下载更新'}
          </button>
        </>
      ) : update.status === 'downloading' ? (
        <>
          <p className="font-semibold">正在下载 v{version}</p>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-800">
            <div className="h-full rounded-full bg-cyan-400 transition-all" style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-2 text-xs text-slate-400">{progress.toFixed(0)}%</p>
        </>
      ) : (
        <>
          <p className="font-semibold">更新已准备完成</p>
          <p className="mt-1 text-xs text-slate-400">重启应用后完成安装。</p>
          <button type="button" className="mt-3 rounded-lg bg-cyan-400 px-3 py-2 text-xs font-semibold text-slate-950 disabled:opacity-50" disabled={busy} onClick={() => void install()}>
            重启并安装
          </button>
        </>
      )}
    </div>
  );
}

export default UpdateNotifier;
