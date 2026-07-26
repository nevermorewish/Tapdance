import { useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { ApiSettings } from '../../../types.ts';
import { applyNewApiAuth, loginToNewApi, registerNewApi } from '../../../services/newApiAuth.ts';

type Props = {
  apiSettings: ApiSettings;
  setApiSettings: Dispatch<SetStateAction<ApiSettings>>;
  onAuthenticated?: () => void;
};

export function NewApiAuthPanel({ apiSettings, setApiSettings, onAuthenticated }: Props) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [baseUrl, setBaseUrl] = useState(apiSettings.newapi.baseUrl);
  const [username, setUsername] = useState(apiSettings.newapi.user?.username || '');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const submit = async () => {
    if (!baseUrl.trim() || !username.trim() || password.length < 8) {
      setMessage('请填写 NewAPI 地址、用户名和至少 8 位密码。');
      return;
    }
    setBusy(true);
    setMessage('');
    try {
      const config = { ...apiSettings.newapi, baseUrl: baseUrl.trim() };
      if (mode === 'register') {
        await registerNewApi(config, { username: username.trim(), password, email: email.trim() || undefined, verificationCode: verificationCode.trim() || undefined });
        setMode('login');
        setMessage('注册成功，请使用新账号登录。');
        return;
      }
      const result = await loginToNewApi(config, username.trim(), password);
      setApiSettings((previous) => applyNewApiAuth({ ...previous, newapi: { ...previous.newapi, baseUrl: baseUrl.trim() } }, result));
      setMessage(`已登录 NewAPI：${result.user.username}`);
      onAuthenticated?.();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-zinc-950/80 p-7 shadow-2xl">
      <div className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-300">NewAPI 连接</div>
      <h1 className="mt-3 text-3xl font-semibold text-white">{mode === 'login' ? '登录到 NewAPI' : '注册 NewAPI 账号'}</h1>
      <p className="mt-3 text-sm leading-6 text-zinc-400">文本、图片、视频和素材库统一使用此连接。登录后会自动获取账号令牌，无需手工复制 API Key。</p>
      <div className="mt-6 space-y-3">
        <label className="block text-sm text-zinc-300">NewAPI 地址<input className="studio-input mt-2" value={baseUrl} onChange={(event) => setBaseUrl(event.target.value)} placeholder="https://api.huanxing.ai" /></label>
        <label className="block text-sm text-zinc-300">用户名<input className="studio-input mt-2" value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" /></label>
        <label className="block text-sm text-zinc-300">密码<input className="studio-input mt-2" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} /></label>
        {mode === 'register' ? <>
          <label className="block text-sm text-zinc-300">邮箱（如服务端要求）<input className="studio-input mt-2" type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
          <label className="block text-sm text-zinc-300">邮箱验证码（如服务端要求）<input className="studio-input mt-2" value={verificationCode} onChange={(event) => setVerificationCode(event.target.value)} /></label>
        </> : null}
      </div>
      {message ? <div className="mt-4 rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-3 text-sm text-cyan-100">{message}</div> : null}
      <button type="button" onClick={() => void submit()} disabled={busy} className="studio-button studio-button-primary mt-6 w-full justify-center">{busy ? '处理中…' : mode === 'login' ? '登录并连接' : '注册账号'}</button>
      <button type="button" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setMessage(''); }} className="mt-4 w-full text-sm text-zinc-400 hover:text-white">{mode === 'login' ? '没有账号？注册 NewAPI' : '已有账号？返回登录'}</button>
    </div>
  );
}
