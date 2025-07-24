const UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const SESSION_COOKIE_NAME = 'homepage_session';
const SESSION_TTL = 60 * 60 * 24 * 15; // 15天
const DATA_KEY = 'homepage_data';
const FIXED_CODE = '2550931665';

async function redisFetch(path, options = {}) {
  return fetch(`${UPSTASH_REDIS_REST_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${UPSTASH_REDIS_REST_TOKEN}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
}

function parseCookies(req) {
  const cookieHeader = req.headers.get('cookie') || '';
  const cookies = {};
  cookieHeader.split(';').forEach(cookie => {
    const [name, ...rest] = cookie.trim().split('=');
    if (!name) return;
    cookies[name] = decodeURIComponent(rest.join('='));
  });
  return cookies;
}

function getSessionId(req) {
  const cookies = parseCookies(req);
  return cookies[SESSION_COOKIE_NAME] || null;
}

function setSessionCookie(sessionId) {
  // 15天有效
  const expires = new Date(Date.now() + SESSION_TTL * 1000).toUTCString();
  return `${SESSION_COOKIE_NAME}=${sessionId}; Path=/; HttpOnly; SameSite=Lax; Expires=${expires}`;
}

export async function GET(req) {
  const url = new URL(req.url);
  const key = url.searchParams.get('key');
  if (!key) return new Response(JSON.stringify({ error: 'Missing key' }), { status: 400, headers: { 'Content-Type': 'application/json' } });

  // 校验 session
  const sessionId = getSessionId(req);
  if (!sessionId) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  // 检查 session 是否有效
  const sessionResp = await redisFetch(`/get/homepage_session_${sessionId}`);
  const sessionData = await sessionResp.json();
  if (!sessionData.result) return new Response(JSON.stringify({ error: 'Session expired' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  // 延长 session
  await redisFetch(`/set/homepage_session_${sessionId}`, { method: 'POST', body: JSON.stringify('1') });
  await redisFetch(`/expire/homepage_session_${sessionId}/${SESSION_TTL}`, { method: 'POST' });

  // 取数据
  const resp = await redisFetch(`/get/${key}`);
  const data = await resp.json();
  return new Response(JSON.stringify(data), { status: 200, headers: { 'Content-Type': 'application/json' } });
}

export async function POST(req) {
  const body = await req.json();
  const { key, value, code, action } = body;

  // 验证码请求
  if (action === 'request_code') {
    // 直接返回写死的验证码
    return new Response(JSON.stringify({ code: FIXED_CODE }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }

  // 校验验证码
  if (action === 'verify_code') {
    if (code === FIXED_CODE) {
      // 生成 session
      const sessionId = Math.random().toString(36).slice(2) + Date.now();
      await redisFetch(`/set/homepage_session_${sessionId}`, { method: 'POST', body: JSON.stringify('1') });
      await redisFetch(`/expire/homepage_session_${sessionId}/${SESSION_TTL}`, { method: 'POST' });
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': setSessionCookie(sessionId)
        }
      });
    } else {
      return new Response(JSON.stringify({ success: false, error: '验证码错误或已过期' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }
  }

  // 其它操作需 session
  const sessionId = getSessionId(req);
  if (!sessionId) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  const sessionResp = await redisFetch(`/get/homepage_session_${sessionId}`);
  const sessionData = await sessionResp.json();
  if (!sessionData.result) return new Response(JSON.stringify({ error: 'Session expired' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  // 延长 session
  await redisFetch(`/set/homepage_session_${sessionId}`, { method: 'POST', body: JSON.stringify('1') });
  await redisFetch(`/expire/homepage_session_${sessionId}/${SESSION_TTL}`, { method: 'POST' });

  // set 数据
  if (!key) return new Response(JSON.stringify({ error: 'Missing key' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  await redisFetch(`/set/${key}`, { method: 'POST', body: JSON.stringify(value) });
  return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
}

export async function DELETE(req) {
  const url = new URL(req.url);
  const key = url.searchParams.get('key');
  if (!key) return new Response(JSON.stringify({ error: 'Missing key' }), { status: 400, headers: { 'Content-Type': 'application/json' } });

  // 校验 session
  const sessionId = getSessionId(req);
  if (!sessionId) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  const sessionResp = await redisFetch(`/get/homepage_session_${sessionId}`);
  const sessionData = await sessionResp.json();
  if (!sessionData.result) return new Response(JSON.stringify({ error: 'Session expired' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  // 延长 session
  await redisFetch(`/set/homepage_session_${sessionId}`, { method: 'POST', body: JSON.stringify('1') });
  await redisFetch(`/expire/homepage_session_${sessionId}/${SESSION_TTL}`, { method: 'POST' });

  // 删除数据
  const resp = await redisFetch(`/del/${key}`, { method: 'POST' });
  const data = await resp.json();
  return new Response(JSON.stringify(data), { status: 200, headers: { 'Content-Type': 'application/json' } });
} 