// Auto-generated API client from browser-trace capture.
// Usage: import {  } from './client.mjs';

const BASE = 'https://my.imobzi.com';

const defaultHeaders = {
  'Content-Type': 'application/json',
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
};

async function request(path, { method = 'GET', body, query, headers } = {}) {
  let url = BASE + path;
  if (query) {
    const qs = new URLSearchParams(Object.entries(query).filter(([, v]) => v != null));
    if (qs.toString()) url += '?' + qs;
  }
  const res = await fetch(url, {
    method,
    headers: { ...defaultHeaders, ...headers },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}: ${await res.text()}`);
  const ct = res.headers.get('content-type') || '';
  return ct.includes('json') ? res.json() : res.text();
}

export async function getv1_financial_accounts(options = {}) {
  return request('/v1/financial/accounts', {
    method: 'GET',
    ...options,
  });
}

export async function getv1_network_group(options = {}) {
  return request('/v1/network-group/', {
    method: 'GET',
    ...options,
  });
}

export async function getv1_subscription(options = {}) {
  return request('/v1/subscription', {
    method: 'GET',
    ...options,
  });
}

export async function getv1_real_estate(options = {}) {
  return request('/v1/real-estate', {
    method: 'GET',
    ...options,
  });
}

export async function getv1_parameters(options = {}) {
  return request('/v1/parameters', {
    method: 'GET',
    ...options,
  });
}

export async function getv1_user_id_rules(options = {}) {
  return request('/v1/user/{id}/rules', {
    method: 'GET',
    ...options,
  });
}

export async function getv1_lease_code__code(options = {}) {
  return request('/v1/lease/code/:code', {
    method: 'GET',
    ...options,
  });
}

export async function getv1_leases(options = {}) {
  return request('/v1/leases', {
    method: 'GET',
    ...options,
  });
}

export async function getv1_lease_checklist(options = {}) {
  return request('/v1/lease/checklist', {
    method: 'GET',
    ...options,
  });
}

export async function getv1_invoices(options = {}) {
  return request('/v1/invoices', {
    method: 'GET',
    ...options,
  });
}

