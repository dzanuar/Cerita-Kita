// src/scripts/data/api.js
import CONFIG from '../config';
import SessionStorage from '../utils/session-storage';

/** Helper: aman membaca JSON meskipun body kosong */
async function safeJson(res) {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

/** Helper: fetch dengan error-handling yang baik */
async function request(path, { method = 'GET', body, auth = false, headers = {} } = {}) {
  const url = path.startsWith('http') ? path : `${CONFIG.BASE_URL}${path}`;
  const finalHeaders = {
    'Content-Type': body instanceof FormData ? undefined : 'application/json',
    ...headers,
  };

  // Jangan set Content-Type saat FormData
  if (finalHeaders['Content-Type'] === undefined) delete finalHeaders['Content-Type'];

  if (auth) {
    const token = SessionStorage.getUserToken?.();
    if (token) finalHeaders.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    method,
    headers: finalHeaders,
    body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
  });

  if (res.ok) {
    if (res.status === 204) return {};
    return safeJson(res);
  }

  const errText = await res.text().catch(() => '');
  let message = `HTTP ${res.status}`;
  if (errText) message += `: ${errText}`;
  const error = new Error(message);
  error.status = res.status;
  throw error;
}

/* ============ PUBLIC APIS ============ */

export async function loginUser({ email, password }) {
  // POST /login
  return request('/login', { method: 'POST', body: { email, password } });
}

export async function registerUser({ name, email, password }) {
  // POST /register
  return request('/register', { method: 'POST', body: { name, email, password } });
}

export async function getAllStories() {
  // GET /stories (BUTUH AUTH di Story API v1)
  const data = await request('/stories', { method: 'GET', auth: true });
  // Normalisasi bila API mengembalikan {listStory: [...]}
  return data?.listStory || data?.stories || [];
}

export async function addNewStory(formData /* FormData */) {
  // POST /stories (auth)
  return request('/stories', { method: 'POST', body: formData, auth: true });
}
