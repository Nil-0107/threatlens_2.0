const API_BASE = '/api';

export function getAuthToken() {
  return localStorage.getItem('threatlens_token') || null;
}

export function setAuthToken(token) {
  if (token) {
    localStorage.setItem('threatlens_token', token);
  } else {
    localStorage.removeItem('threatlens_token');
  }
}

export function getStoredUser() {
  try {
    const raw = localStorage.getItem('threatlens_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setStoredUser(user) {
  if (user) {
    localStorage.setItem('threatlens_user', JSON.stringify(user));
  } else {
    localStorage.removeItem('threatlens_user');
  }
}

function authHeaders(extra = {}) {
  const headers = { ...extra };
  const token = getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export async function checkBackendHealth() {
  try {
    const res = await fetch('/');
    return res.ok;
  } catch {
    return false;
  }
}

export async function loginUser(email, password) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Authentication failed' }));
    throw new Error(err.detail || 'Login failed');
  }
  const data = await res.json();
  setAuthToken(data.access_token);
  setStoredUser({
    email: data.email,
    role: data.role,
    full_name: data.full_name,
  });
  return data;
}

export async function signupUser(email, password, fullName, role = 'analyst') {
  const res = await fetch(`${API_BASE}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      password,
      full_name: fullName,
      role,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Registration failed' }));
    throw new Error(err.detail || 'Sign up failed');
  }
  const data = await res.json();
  setAuthToken(data.access_token);
  setStoredUser({
    email: data.email,
    role: data.role,
    full_name: data.full_name,
  });
  return data;
}

export function logoutUser() {
  setAuthToken(null);
  setStoredUser(null);
}

export async function uploadEmail(formDataOrText) {
  let options = {
    method: 'POST',
    headers: authHeaders(),
  };

  if (formDataOrText instanceof FormData) {
    options.body = formDataOrText;
  } else {
    const fd = new FormData();
    fd.append('raw_content', formDataOrText);
    options.body = fd;
  }

  const res = await fetch(`${API_BASE}/emails/upload`, options);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Upload failed' }));
    throw new Error(err.detail || 'Upload failed');
  }
  return res.json();
}

export async function listEmails() {
  const res = await fetch(`${API_BASE}/emails`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Failed to fetch emails');
  return res.json();
}

export async function getEmailDetail(id) {
  const res = await fetch(`${API_BASE}/emails/${id}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Failed to fetch email detail');
  return res.json();
}

export async function deleteEmail(id) {
  const res = await fetch(`${API_BASE}/emails/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Failed to delete email');
  return res.json();
}

export async function clearAllEmails() {
  const res = await fetch(`${API_BASE}/emails`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Failed to clear queue');
  return res.json();
}

export async function getEmailTrace(id) {
  const res = await fetch(`${API_BASE}/emails/${id}/trace`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Failed to fetch hop trace');
  return res.json();
}

export async function verifyChain(id) {
  const res = await fetch(`${API_BASE}/emails/${id}/verify-chain`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Failed to verify chain');
  return res.json();
}

export async function exportReportPdf(id, maskPii = false) {
  const res = await fetch(`${API_BASE}/emails/${id}/export?mask_pii=${maskPii}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Failed to generate PDF report');
  return res.blob();
}

export async function getAiBriefing(id) {
  const res = await fetch(`${API_BASE}/emails/${id}/ai-briefing`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Failed to generate AI briefing');
  return res.json();
}

export async function listCases() {
  const res = await fetch(`${API_BASE}/cases`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Failed to fetch cases');
  return res.json();
}

export async function getCaseDetail(id) {
  const res = await fetch(`${API_BASE}/cases/${id}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Failed to fetch case detail');
  return res.json();
}

export async function linkEmailToCase(caseId, emailId) {
  const res = await fetch(`${API_BASE}/cases/${caseId}/link`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ email_id: emailId }),
  });
  if (!res.ok) throw new Error('Failed to link email to case');
  return res.json();
}

export async function getSettings() {
  const res = await fetch(`${API_BASE}/settings`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Failed to fetch settings');
  return res.json();
}

export async function updateRetention(days) {
  const res = await fetch(`${API_BASE}/settings/retention`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ retention_days: days }),
  });
  if (!res.ok) throw new Error('Failed to update retention');
  return res.json();
}

export async function simulateTamper(logId, tamperedActor = 'unauthorized_intruder') {
  const res = await fetch(`${API_BASE}/debug/tamper-log`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ log_id: logId, tampered_actor: tamperedActor }),
  });
  if (!res.ok) throw new Error('Failed to tamper log');
  return res.json();
}
