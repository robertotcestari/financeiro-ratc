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

export async function getv1_invoices(options = {}) {
  return request('/v1/invoices', {
    method: 'GET',
    ...options,
  });
}

export async function getv1_invoice_id(options = {}) {
  return request('/v1/invoice/{id}', {
    method: 'GET',
    ...options,
  });
}

export async function getv1_financial_landlord_account_onlending_id(options = {}) {
  return request('/v1/financial/landlord/account/onlending/{id}', {
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

export async function getv1_lease_id(options = {}) {
  return request('/v1/lease/{id}', {
    method: 'GET',
    ...options,
  });
}

export async function getv1_lease_code_id(options = {}) {
  return request('/v1/lease/code/{id}', {
    method: 'GET',
    ...options,
  });
}

export async function getv1_financial_accounts(options = {}) {
  return request('/v1/financial/accounts', {
    method: 'GET',
    ...options,
  });
}

export async function getv1_financial_account_id(options = {}) {
  return request('/v1/financial/account/{id}', {
    method: 'GET',
    ...options,
  });
}

export async function getv1_financial_transactions(options = {}) {
  return request('/v1/financial/transactions', {
    method: 'GET',
    ...options,
  });
}

export async function getv1_financial_transaction_id(options = {}) {
  return request('/v1/financial/transaction/{id}', {
    method: 'GET',
    ...options,
  });
}

export async function getv1_financial_categories(options = {}) {
  return request('/v1/financial/categories', {
    method: 'GET',
    ...options,
  });
}

export async function getv1_financial_tags(options = {}) {
  return request('/v1/financial/tags', {
    method: 'GET',
    ...options,
  });
}

export async function getv1_financial_organization(options = {}) {
  return request('/v1/financial/organization', {
    method: 'GET',
    ...options,
  });
}

export async function getv1_banks(options = {}) {
  return request('/v1/banks', {
    method: 'GET',
    ...options,
  });
}

export async function getv1_financial_landlord_accounts(options = {}) {
  return request('/v1/financial/landlord/accounts', {
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

export async function getv1_real_estate(options = {}) {
  return request('/v1/real-estate', {
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

export async function getv1_financial_landlord_account_id(options = {}) {
  return request('/v1/financial/landlord/account/{id}', {
    method: 'GET',
    ...options,
  });
}

export async function getv1_financial_landlord_account_id_transactions(options = {}) {
  return request('/v1/financial/landlord/account/{id}/transactions', {
    method: 'GET',
    ...options,
  });
}

export async function getv1_financial_landlord_account_id_onlending(options = {}) {
  return request('/v1/financial/landlord/account/{id}/onlending', {
    method: 'GET',
    ...options,
  });
}

export async function getv1_financial_landlord_account_individual_onlending_id(options = {}) {
  return request('/v1/financial/landlord/account/individual-onlending/{id}', {
    method: 'GET',
    ...options,
  });
}

export async function getv1_reports_landlord_account_onlending(options = {}) {
  return request('/v1/reports/landlord/account/onlending', {
    method: 'GET',
    ...options,
  });
}

export async function getv1_commission_onlending(options = {}) {
  return request('/v1/commission/onlending', {
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

export async function getv1_user_id_rules(options = {}) {
  return request('/v1/user/{id}/rules', {
    method: 'GET',
    ...options,
  });
}

