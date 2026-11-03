// Small fetch wrapper. The session lives in an httpOnly cookie, so no token is stored in JS.
export class ApiError extends Error {
  constructor(status, body) {
    super(body?.error || 'Request failed');
    this.status = status;
    this.body = body || {};
  }
}

export async function api(path, { method = 'GET', body } = {}) {
  const res = await fetch(`/api${path}`, {
    method,
    credentials: 'include',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 204) return null;
  let data = null;
  try { data = await res.json(); } catch { /* empty body */ }
  if (!res.ok) throw new ApiError(res.status, data || { error: 'Could not reach the server. Check your connection.' });
  return data;
}
export const get = (p) => api(p);
export const post = (p, body) => api(p, { method: 'POST', body: body || {} });
export const patch = (p, body) => api(p, { method: 'PATCH', body });
export const del = (p) => api(p, { method: 'DELETE' });
