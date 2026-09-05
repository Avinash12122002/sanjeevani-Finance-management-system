/**
 * Sanjeevani Finance Management System - Client API Service
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:4000/api/v1';

export async function fetchApi<T = any>(
  endpoint: string,
  options: RequestInit = {},
): Promise<{ success: boolean; data?: T; message?: string; error?: string }> {
  const isPortal = typeof window !== 'undefined' && window.location.pathname.startsWith('/portal');
  const token = typeof window !== 'undefined'
    ? (isPortal
        ? localStorage.getItem('sfms_customer_token')
        : localStorage.getItem('sfms_access_token') || localStorage.getItem('sjf_auth_token'))
    : null;

  const isMutating = options.method && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(options.method.toUpperCase());
  const requestId = `REQ-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Request-ID': requestId,
    ...(isMutating ? { 'Idempotency-Key': `IDEM-${Date.now()}-${Math.random().toString(36).substring(2, 9)}` } : {}),
    ...(options.headers as any),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  try {
    const res = await fetch(`${API_BASE}${normalizedEndpoint}`, {
      cache: 'no-store',
      ...options,
      headers,
    });

    if (res.status === 401) {
      if (endpoint.includes('/login')) {
        let json: any = {};
        try {
          const text = await res.text();
          json = text ? JSON.parse(text) : {};
        } catch {
          // ignore
        }
        return {
          success: false,
          error: json.message || 'Invalid credentials.',
          message: json.message || 'Invalid credentials.',
        };
      }

      if (typeof window !== 'undefined') {
        if (isPortal) {
          if (window.location.pathname !== '/portal/login') {
            localStorage.removeItem('sfms_customer_token');
            localStorage.removeItem('sfms_customer');
            window.location.href = '/portal/login';
          }
        } else {
          if (window.location.pathname !== '/login') {
            localStorage.removeItem('sfms_access_token');
            localStorage.removeItem('sfms_user');
            localStorage.removeItem('sjf_auth_token');
            window.location.href = '/login';
          }
        }
      }
      return {
        success: false,
        error: 'Authentication session expired. Please sign in again.',
        message: 'Authentication session expired. Please sign in again.',
      };
    }

    let json: any = {};
    const text = await res.text();
    try {
      json = text ? JSON.parse(text) : {};
    } catch {
      json = { message: text || `HTTP ${res.status}: Failed request` };
    }

    if (!res.ok) {
      const errorMsg = json.error?.message || json.message || `Error ${res.status}: Server request failed`;
      return {
        success: false,
        error: errorMsg,
        message: errorMsg,
      };
    }

    return {
      success: true,
      data: json.data !== undefined ? json.data : json,
      message: json.message,
    };
  } catch (err: any) {
    console.error(`API Error on ${endpoint}:`, err);
    return {
      success: false,
      error: err.message || 'Failed to connect to backend server. Please verify the API is running on port 4000.',
      message: err.message || 'Failed to connect to backend server. Please verify the API is running on port 4000.',
    };
  }
}

import { sanitizeFormData } from './emoji-sanitizer';

export async function postApi<T = any>(endpoint: string, body?: any, options: RequestInit = {}) {
  const sanitizedBody = body !== undefined ? sanitizeFormData(body) : undefined;
  return fetchApi<T>(endpoint, {
    method: 'POST',
    body: sanitizedBody ? JSON.stringify(sanitizedBody) : undefined,
    ...options,
  });
}

export async function patchApi<T = any>(endpoint: string, body?: any, options: RequestInit = {}) {
  const sanitizedBody = body !== undefined ? sanitizeFormData(body) : undefined;
  return fetchApi<T>(endpoint, {
    method: 'PATCH',
    body: sanitizedBody ? JSON.stringify(sanitizedBody) : undefined,
    ...options,
  });
}

export async function putApi<T = any>(endpoint: string, body?: any, options: RequestInit = {}) {
  const sanitizedBody = body !== undefined ? sanitizeFormData(body) : undefined;
  return fetchApi<T>(endpoint, {
    method: 'PUT',
    body: sanitizedBody ? JSON.stringify(sanitizedBody) : undefined,
    ...options,
  });
}

export async function deleteApi<T = any>(endpoint: string, options: RequestInit = {}) {
  return fetchApi<T>(endpoint, {
    method: 'DELETE',
    ...options,
  });
}

