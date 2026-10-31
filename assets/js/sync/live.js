import { SYNC_URL } from './config.js';

const PING_MS = 45_000;
const RETRY_MS = [2_000, 5_000, 15_000, 60_000];

let socket = null, pingTimer = null, retryTimer = null, retries = 0, wanted = null;

export const liveConnected = () => socket?.readyState === WebSocket.OPEN;

function clearTimers() {
  clearInterval(pingTimer);
  clearTimeout(retryTimer);
}

export function openLive(token, onVersion) {
  wanted = { token, onVersion };
  if (socket || navigator.onLine === false) return;
  clearTimers();
  const ws = new WebSocket(`${SYNC_URL.replace(/^http/, 'ws')}/v1/live`, ['clockwise', token]);
  socket = ws;
  ws.onopen = () => {
    retries = 0;
    pingTimer = setInterval(() => ws.readyState === WebSocket.OPEN && ws.send('ping'), PING_MS);
  };
  ws.onmessage = e => {
    if (e.data === 'pong') return;
    try { const { v } = JSON.parse(e.data); if (Number.isInteger(v)) onVersion(v); } catch { }
  };
  ws.onclose = () => {
    clearInterval(pingTimer);
    if (socket === ws) socket = null;
    if (wanted) retryTimer = setTimeout(() => wanted && openLive(wanted.token, wanted.onVersion), RETRY_MS[Math.min(retries++, RETRY_MS.length - 1)]);
  };
}

export function closeLive() {
  wanted = null;
  clearTimers();
  const ws = socket;
  socket = null;
  ws?.close();
}
