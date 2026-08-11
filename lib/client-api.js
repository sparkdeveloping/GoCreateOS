function apiBase() {
  return String(process.env.NEXT_PUBLIC_GOCREATE_API_URL || '').trim().replace(/\/$/, '');
}

export function apiUrl(pathname = '') {
  const path = String(pathname || '');
  if (/^https?:\/\//i.test(path)) return path;
  const normalized = path.startsWith('/') ? path : `/${path}`;
  const base = apiBase();
  return base ? `${base}${normalized}` : normalized;
}

export function getClientAdminToken() {
  if (typeof window === 'undefined') return '';
  try { return window.localStorage.getItem('gocreate_admin_token') || ''; } catch { return ''; }
}

export function setClientAdminToken(token) {
  if (typeof window === 'undefined') return;
  try {
    if (token) window.localStorage.setItem('gocreate_admin_token', token);
    else window.localStorage.removeItem('gocreate_admin_token');
  } catch {}
}

export async function apiFetch(pathname, options = {}) {
  const headers = new Headers(options.headers || {});
  headers.set('x-gocreate-client', 'web-v5');
  const token = getClientAdminToken();
  if (token && !headers.has('authorization')) headers.set('authorization', `Bearer ${token}`);
  return fetch(apiUrl(pathname), {
    ...options,
    headers,
    credentials: options.credentials || 'include',
  });
}

export async function downloadApiFile(pathname, fallbackFilename = 'gocreate-export.csv') {
  const response = await apiFetch(pathname, { cache: 'no-store' });
  if (!response.ok) {
    const result = await response.json().catch(() => ({}));
    throw new Error(result.error || `Download failed with status ${response.status}.`);
  }
  const blob = await response.blob();
  const disposition = response.headers.get('content-disposition') || '';
  const filename = disposition.match(/filename="?([^";]+)"?/i)?.[1] || fallbackFilename;
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function assetUrl(value = '') {
  const source = String(value || '').trim();
  if (!source || /^(data:|blob:|https?:\/\/)/i.test(source)) return source;
  return apiUrl(source);
}

export function coreOrigin() {
  return apiBase();
}
