import { NextRequest, NextResponse } from 'next/server';

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

function getSessionId(req) {
  const cookie = req.cookies.get(SESSION_COOKIE_NAME);
  return cookie?.value || null;
}

function setSessionCookie(res, sessionId) {
  res.cookies.set(SESSION_COOKIE_NAME, sessionId, {
    httpOnly: true,
    maxAge: SESSION_TTL,
    path: '/',
    sameSite: 'lax',
  });
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const key = searchParams.get('key');
  if (!key) return NextResponse.json({ error: 'Missing key' }, { status: 400 });

  // 校验 session
  const sessionId = getSessionId(req);
  if (!sessionId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  // 检查 session 是否有效
  const sessionResp = await redisFetch(`/get/homepage_session_${sessionId}`);
  const sessionData = await sessionResp.json();
  if (!sessionData.result) return NextResponse.json({ error: 'Session expired' }, { status: 401 });
  // 延长 session
  await redisFetch(`/set/homepage_session_${sessionId}`, { method: 'POST', body: JSON.stringify('1') });
  await redisFetch(`/expire/homepage_session_${sessionId}/${SESSION_TTL}`, { method: 'POST' });

  // 取数据
  const resp = await redisFetch(`/get/${key}`);
  const data = await resp.json();
  return NextResponse.json(data);
}

export async function POST(req) {
  const body = await req.json();
  const { key, value, code, action } = body;

  // 验证码请求
  if (action === 'request_code') {
    // 直接返回写死的验证码
    return NextResponse.json({ code: FIXED_CODE });
  }

  // 校验验证码
  if (action === 'verify_code') {
    if (code === FIXED_CODE) {
      // 生成 session
      const sessionId = Math.random().toString(36).slice(2) + Date.now();
      await redisFetch(`/set/homepage_session_${sessionId}`, { method: 'POST', body: JSON.stringify('1') });
      await redisFetch(`/expire/homepage_session_${sessionId}/${SESSION_TTL}`, { method: 'POST' });
      const res = NextResponse.json({ success: true });
      setSessionCookie(res, sessionId);
      return res;
    } else {
      return NextResponse.json({ success: false, error: '验证码错误或已过期' }, { status: 401 });
    }
  }

  // 其它操作需 session
  const sessionId = getSessionId(req);
  if (!sessionId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const sessionResp = await redisFetch(`/get/homepage_session_${sessionId}`);
  const sessionData = await sessionResp.json();
  if (!sessionData.result) return NextResponse.json({ error: 'Session expired' }, { status: 401 });
  // 延长 session
  await redisFetch(`/set/homepage_session_${sessionId}`, { method: 'POST', body: JSON.stringify('1') });
  await redisFetch(`/expire/homepage_session_${sessionId}/${SESSION_TTL}`, { method: 'POST' });

  // set 数据
  if (!key) return NextResponse.json({ error: 'Missing key' }, { status: 400 });
  await redisFetch(`/set/${key}`, { method: 'POST', body: JSON.stringify(value) });
  return NextResponse.json({ success: true });
}

export async function DELETE(req) {
  const { searchParams } = new URL(req.url);
  const key = searchParams.get('key');
  if (!key) return NextResponse.json({ error: 'Missing key' }, { status: 400 });

  // 校验 session
  const sessionId = getSessionId(req);
  if (!sessionId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const sessionResp = await redisFetch(`/get/homepage_session_${sessionId}`);
  const sessionData = await sessionResp.json();
  if (!sessionData.result) return NextResponse.json({ error: 'Session expired' }, { status: 401 });
  // 延长 session
  await redisFetch(`/set/homepage_session_${sessionId}`, { method: 'POST', body: JSON.stringify('1') });
  await redisFetch(`/expire/homepage_session_${sessionId}/${SESSION_TTL}`, { method: 'POST' });

  // 删除数据
  const resp = await redisFetch(`/del/${key}`, { method: 'POST' });
  const data = await resp.json();
  return NextResponse.json(data);
} 