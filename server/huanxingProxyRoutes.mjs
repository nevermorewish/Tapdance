const sessions = new Map();

function normalizeBaseUrl(value) {
  const normalized = String(value || '').trim().replace(/\/+$/u, '');
  if (!normalized) throw new Error('请先填写 NewAPI 地址。');
  const parsed = new URL(normalized);
  if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('NewAPI 地址必须是 http 或 https。');
  return normalized.replace(/\/v1$/iu, '');
}

function getCookieHeader(response) {
  const values = typeof response.headers.getSetCookie === 'function'
    ? response.headers.getSetCookie()
    : (response.headers.get('set-cookie') || '').split(/,(?=[^;]+=)/u);
  return values.map((value) => String(value).split(';', 1)[0]).filter(Boolean).join('; ');
}

async function readPayload(response) {
  const text = await response.text();
  try { return text ? JSON.parse(text) : {}; } catch { return { message: text }; }
}

async function callUpstream(baseUrl, path, init = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: { Accept: 'application/json', ...(init.headers || {}) },
  });
  const payload = await readPayload(response);
  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.message || payload?.error?.message || `NewAPI 请求失败 (${response.status})`);
  }
  return { response, payload };
}

async function getTokenRecords(baseUrl, cookie, userId) {
  const headers = { Cookie: cookie, 'New-Api-User': String(userId) };
  let tokenResponse = await callUpstream(baseUrl, '/api/token/?p=1&size=100', { headers });
  let items = tokenResponse.payload?.data?.items || tokenResponse.payload?.items || [];
  if (!Array.isArray(items) || items.length === 0) {
    await callUpstream(baseUrl, '/api/token/', {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Tapdance', unlimited_quota: true, expired_time: -1, group: 'default' }),
    });
    tokenResponse = await callUpstream(baseUrl, '/api/token/?p=1&size=100', { headers });
    items = tokenResponse.payload?.data?.items || tokenResponse.payload?.items || [];
  }
  const activeItems = items.filter((item) => item?.status !== 0 && item?.id);
  const records = [];
  for (const item of activeItems) {
    const keyResponse = await callUpstream(baseUrl, `/api/token/${encodeURIComponent(item.id)}/key`, {
      method: 'POST', headers,
    });
    const rawKey = keyResponse.payload?.data?.key || keyResponse.payload?.data || keyResponse.payload?.key;
    if (!rawKey) continue;
    records.push({
      id: Number(item.id),
      name: String(item.name || `令牌 ${item.id}`),
      group: String(item.group || 'default'),
      status: Number(item.status ?? 1),
      key: String(rawKey).startsWith('sk-') ? String(rawKey) : `sk-${rawKey}`,
    });
  }
  if (records.length === 0) throw new Error('NewAPI 账号没有可用令牌，请在 NewAPI 中创建一个令牌后重试。');
  const preferred = records.find((token) => token.group.toLowerCase() === 'default') || records[0];
  return { records, selected: preferred };
}

export function registerHuanxingProxyRoutes(app) {
  app.post('/api/seedance/newapi/login', async (request, response) => {
    try {
      const body = request.body || {};
      const baseUrl = normalizeBaseUrl(body.baseUrl);
      const login = await callUpstream(baseUrl, `/api/user/login?turnstile=${encodeURIComponent(String(body.turnstile || ''))}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: String(body.username || '').trim(), password: String(body.password || '') }),
      });
      if (login.payload?.data?.require_2fa) throw new Error('该账号启用了二次验证，请先在 NewAPI 网页端完成登录。');
      const cookie = getCookieHeader(login.response);
      const user = login.payload?.data || {};
      if (!cookie || !user.id) throw new Error('NewAPI 登录响应缺少会话信息。');
      const tokenResult = await getTokenRecords(baseUrl, cookie, user.id);
      sessions.set(baseUrl, { cookie, userId: user.id });
      response.json({ success: true, data: { user: {
        id: Number(user.id), username: String(user.username || body.username || ''),
        displayName: user.display_name || user.username || body.username || '',
        email: user.email || '',
      }, tokens: tokenResult.records, selectedTokenId: tokenResult.selected.id, apiKey: tokenResult.selected.key } });
    } catch (error) {
      response.status(400).json({ success: false, message: error instanceof Error ? error.message : String(error) });
    }
  });

  app.post('/api/seedance/newapi/register', async (request, response) => {
    try {
      const body = request.body || {};
      const baseUrl = normalizeBaseUrl(body.baseUrl);
      const payload = {
        username: String(body.username || '').trim(), password: String(body.password || ''),
        ...(body.email ? { email: String(body.email).trim() } : {}),
        ...(body.verificationCode ? { verification_code: String(body.verificationCode).trim() } : {}),
        ...(body.affCode ? { aff_code: String(body.affCode).trim() } : {}),
      };
      const result = await callUpstream(baseUrl, `/api/user/register?turnstile=${encodeURIComponent(String(body.turnstile || ''))}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      response.json({ success: true, data: result.payload?.data || null, message: result.payload?.message || '' });
    } catch (error) {
      response.status(400).json({ success: false, message: error instanceof Error ? error.message : String(error) });
    }
  });

  app.post('/api/seedance/newapi/balance', async (request, response) => {
    try {
      const baseUrl = normalizeBaseUrl(request.body?.baseUrl);
      const session = sessions.get(baseUrl);
      if (!session) throw new Error('尚未登录 NewAPI。');
      const headers = { Cookie: session.cookie, 'New-Api-User': String(session.userId) };
      const [self, status] = await Promise.all([
        callUpstream(baseUrl, '/api/user/self', { headers }),
        callUpstream(baseUrl, '/api/status', { headers }),
      ]);
      const user = self.payload?.data || {};
      const serviceStatus = status.payload?.data || status.payload || {};
      response.json({ success: true, data: {
        quota: Number(user.quota || 0),
        used_quota: Number(user.used_quota || 0),
      }, status: {
        quota_per_unit: Number(serviceStatus.quota_per_unit || 500000),
        display_in_currency: serviceStatus.display_in_currency !== false,
      } });
    } catch (error) {
      response.status(400).json({ success: false, message: error instanceof Error ? error.message : String(error) });
    }
  });

  app.post('/api/seedance/newapi/logout', async (request, response) => {
    try {
      const baseUrl = normalizeBaseUrl(request.body?.baseUrl);
      const session = sessions.get(baseUrl);
      if (session) await callUpstream(baseUrl, '/api/user/logout', { headers: { Cookie: session.cookie } });
      sessions.delete(baseUrl);
      response.json({ success: true });
    } catch (error) {
      response.status(400).json({ success: false, message: error instanceof Error ? error.message : String(error) });
    }
  });
}
