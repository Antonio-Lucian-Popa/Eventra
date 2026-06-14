import { demoClients, demoEvents, demoInvoices, demoStats, demoVenues } from './demo-data';

export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export function getToken() {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem('eventpro_token');
}

export function getRefreshToken() {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem('eventpro_refresh');
}

export function getStoredUser() {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem('eventpro_user');
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setSession(session) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem('eventpro_token', session.token);
  window.localStorage.setItem('eventpro_refresh', session.refreshToken || '');
  window.localStorage.setItem('eventpro_user', JSON.stringify(session.user || {}));
}

export function clearSession() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem('eventpro_token');
  window.localStorage.removeItem('eventpro_refresh');
  window.localStorage.removeItem('eventpro_user');
}

async function parse(response) {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload?.error?.message || 'Nu am putut comunica cu API-ul.');
    error.status = response.status;
    error.code = payload?.error?.code;
    error.details = payload?.error?.details;
    throw error;
  }
  return payload;
}

async function refreshSession() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;
  const response = await fetch(`${API_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  const payload = await parse(response);
  setSession(payload.data);
  return payload.data.token;
}

export async function apiRequest(path, options = {}, retry = true) {
  const token = getToken();
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  try {
    return await parse(response);
  } catch (error) {
    if (error.status === 401 && retry) {
      const nextToken = await refreshSession().catch(() => null);
      if (nextToken) return apiRequest(path, options, false);
      clearSession();
    }
    throw error;
  }
}

export async function apiFetch(path, options = {}) {
  const payload = await apiRequest(path, options);
  return payload.data ?? payload;
}

export async function listResource(path, params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') query.set(key, value);
  });
  const suffix = query.toString() ? `?${query}` : '';
  return apiRequest(`${path}${suffix}`);
}

export async function createResource(path, body) {
  const payload = await apiRequest(path, { method: 'POST', body: JSON.stringify(body) });
  return payload.data;
}

export async function updateResource(path, id, body) {
  const payload = await apiRequest(`${path}/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
  return payload.data;
}

export async function deleteResource(path, id) {
  await apiRequest(`${path}/${id}`, { method: 'DELETE' });
}

export async function login(email, password) {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const payload = await parse(response);
  setSession(payload.data);
  return payload.data;
}

export async function logout() {
  const refreshToken = getRefreshToken();
  if (refreshToken) {
    await fetch(`${API_URL}/auth/logout`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    }).catch(() => null);
  }
  clearSession();
}

export async function loadDashboard() {
  try {
    const summary = await apiFetch('/dashboard/summary');
    return {
      summary,
      events: summary.next7DaysEvents?.length ? summary.next7DaysEvents : demoEvents,
      venues: summary.venueOccupancy?.length ? summary.venueOccupancy : demoVenues,
      source: 'api',
    };
  } catch {
    return { summary: demoStats, events: demoEvents, venues: demoVenues, source: 'demo' };
  }
}

export async function loadList(path, fallback, params = {}) {
  try {
    const payload = await listResource(path, params);
    return { items: payload.data || fallback, meta: payload.meta, source: 'api' };
  } catch {
    return { items: fallback, meta: { page: 1, pageSize: fallback.length, total: fallback.length }, source: 'demo' };
  }
}

export const loaders = {
  events: (params) => loadList('/events', demoEvents, params),
  clients: (params) => loadList('/clients', demoClients, params),
  invoices: (params) => loadList('/invoices', demoInvoices, params),
  venues: (params) => loadList('/venues', demoVenues, params),
};
