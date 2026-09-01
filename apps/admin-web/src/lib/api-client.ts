/**
 * Sanjeevani Finance Management System - Client API Service
 */

const API_BASE = typeof window !== 'undefined' ? '/api/v1' : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1');

export async function fetchApi<T = any>(
  endpoint: string,
  options: RequestInit = {},
): Promise<{ success: boolean; data?: T; message?: string; error?: string }> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('sfms_access_token') || localStorage.getItem('sjf_auth_token') : null;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as any),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    if (res.status === 401) {
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        localStorage.removeItem('sfms_access_token');
        localStorage.removeItem('sfms_user');
        localStorage.removeItem('sjf_auth_token');
        window.location.href = '/login';
      }
      return {
        success: false,
        error: 'Authentication session expired. Please sign in again.',
        message: 'Authentication session expired. Please sign in again.',
      };
    }

    const json = await res.json();
    if (!res.ok) {
      return {
        success: false,
        error: json.error?.message || json.message || `Error ${res.status}: Failed request`,
        message: json.message || json.error?.message,
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
      error: err.message || 'Failed to connect to backend server',
      message: err.message || 'Failed to connect to backend server',
    };
  }
}

export async function postApi<T = any>(endpoint: string, body?: any, options: RequestInit = {}) {
  return fetchApi<T>(endpoint, {
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
    ...options,
  });
}

export async function patchApi<T = any>(endpoint: string, body?: any, options: RequestInit = {}) {
  return fetchApi<T>(endpoint, {
    method: 'PATCH',
    body: body ? JSON.stringify(body) : undefined,
    ...options,
  });
}

export async function putApi<T = any>(endpoint: string, body?: any, options: RequestInit = {}) {
  return fetchApi<T>(endpoint, {
    method: 'PUT',
    body: body ? JSON.stringify(body) : undefined,
    ...options,
  });
}

export async function deleteApi<T = any>(endpoint: string, options: RequestInit = {}) {
  return fetchApi<T>(endpoint, {
    method: 'DELETE',
    ...options,
  });
}
