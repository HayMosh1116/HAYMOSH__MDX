const DEFAULT_MAX_ACTIVE = 3;
const DEFAULT_MAX_PER_IP = 4;
const DEFAULT_WINDOW_MS = 10 * 60 * 1000;
const activeById = new Set();
const requestsByIp = new Map();
let nextId = 1;

function positiveLimit(value, fallback) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function acquireAuthSession(ip, options = {}) {
  const now = Date.now();
  const maxActive = positiveLimit(options.maxActive ?? process.env.MAX_AUTH_SESSIONS, DEFAULT_MAX_ACTIVE);
  const maxPerIp = positiveLimit(options.maxPerIp, DEFAULT_MAX_PER_IP);
  const windowMs = positiveLimit(options.windowMs, DEFAULT_WINDOW_MS);
  const clientIp = String(ip || 'unknown').slice(0, 100);
  const recent = (requestsByIp.get(clientIp) || []).filter(time => now - time < windowMs);
  if (recent.length >= maxPerIp || activeById.size >= maxActive) {
    requestsByIp.set(clientIp, recent);
    return null;
  }
  recent.push(now);
  requestsByIp.set(clientIp, recent);
  if (requestsByIp.size > 2000) {
    for (const [key, times] of requestsByIp) {
      const fresh = times.filter(time => now - time < windowMs);
      if (fresh.length) requestsByIp.set(key, fresh);
      else requestsByIp.delete(key);
      if (requestsByIp.size <= 1500) break;
    }
  }
  const id = nextId++;
  activeById.add(id);
  let released = false;
  return () => {
    if (released) return;
    released = true;
    activeById.delete(id);
  };
}

function getActiveSessionCount() {
  return activeById.size;
}

module.exports = { acquireAuthSession, getActiveSessionCount };
