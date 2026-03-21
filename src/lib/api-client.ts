/**
 * API Client Configuration
 *
 * Handles the difference between:
 * - Web (Render hosted): relative /api/... paths work because frontend + backend are on the same origin
 * - Android (Capacitor): must use absolute URL to the Render backend
 *
 * Backend runs on Render: https://ethiocars-9jsd.onrender.com
 *
 * IMPORTANT: CapacitorHttp is DISABLED in capacitor.config.ts because it
 * cannot handle ArrayBuffer/binary bodies (hangs on native bridge).
 * The WebView's standard browser engine handles all requests.
 *
 * CRITICAL: Do NOT use `credentials: 'include'` on cross-origin requests.
 * Auth is handled via Authorization Bearer headers, not cookies.
 * Using `credentials: 'include'` causes Android WebView to fail with
 * "Failed to fetch" on binary POST requests (image uploads) because
 * the preflight credential negotiation breaks for binary bodies.
 */

import { Capacitor } from '@capacitor/core';

// FORCE production URL unconditionally
// This ensures mobile ALWAYS uses the same endpoint
export const API_BASE = 'https://ethiocars-9jsd.onrender.com';

/**
 * Default request timeout in milliseconds.
 */
const DEFAULT_TIMEOUT_MS = 30000; // 30 seconds

/**
 * Create an AbortController with a timeout.
 */
function createTimeoutController(timeoutMs: number = DEFAULT_TIMEOUT_MS): { controller: AbortController; timeoutId: ReturnType<typeof setTimeout> } {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  return { controller, timeoutId };
}

/**
 * Safely parse a JSON response.
 * Throws a clear error if the response is not valid JSON (e.g., HTML page returned).
 */
async function safeParseJson(response: Response): Promise<any> {
  const contentType = response.headers.get('content-type');

  if (contentType && contentType.includes('application/json')) {
    return response.json();
  }

  const text = await response.text();

  if (text.trim().startsWith('<!') || text.trim().startsWith('<html')) {
    throw new Error(
      'Server returned an HTML page instead of JSON. ' +
      'This usually means the API URL is incorrect. ' +
      `Status: ${response.status}, URL: ${response.url}`
    );
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error(
      `Server returned non-JSON response (${response.status}). ` +
      `Content-Type: ${contentType || 'none'}. ` +
      `Body preview: ${text.substring(0, 100)}...`
    );
  }
}

/**
 * Enhanced fetch wrapper that:
 * 1. Prepends the correct API base URL
 * 2. Adds request timeout
 * 3. Validates JSON responses safely
 * 4. Retries on network failure
 *
 * @param path - The API path (e.g., '/api/listings')
 * @param options - Standard fetch options
 * @param timeoutMs - Request timeout in milliseconds (default: 30s)
 * @param retries - Number of retries on network failure (default: 2)
 * @returns The parsed JSON response
 */
export async function apiFetch(
  path: string,
  options: RequestInit = {},
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
  retries: number = 2
): Promise<any> {
  const url = `${API_BASE}${path}`;
  const method = options.method || 'GET';
  console.log(`[apiFetch] ${method} ${url}`);
  let lastError;

  for (let i = 0; i <= retries; i++) {
    const { controller, timeoutId } = createTimeoutController(timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Accept': 'application/json',
          ...options.headers,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      console.log(`[apiFetch] ${method} ${url} -> ${response.status}`);

      const data = await safeParseJson(response);

      if (!response.ok) {
        const errorMsg = data?.error || data?.message || `Request failed with status ${response.status}`;
        console.error(`[apiFetch] Error response:`, errorMsg);
        throw new Error(errorMsg);
      }

      return data;
    } catch (error: any) {
      clearTimeout(timeoutId);
      lastError = error;
      console.error(`[apiFetch] ${method} ${url} attempt ${i + 1} failed:`, error.message);

      // Only retry on network errors or timeouts, not on 4xx/5xx errors thrown above
      const isNetworkError = error instanceof TypeError || error.name === 'AbortError';
      
      if (!isNetworkError || i === retries) {
        throw error;
      }

      // Wait before retrying (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
    }
  }

  throw lastError;
}


/**
 * Wake the Render server before uploads.
 * Render free tier sleeps after inactivity — cold start takes 30-60s.
 * Sends a lightweight ping and waits up to 60s before proceeding.
 */
let serverAwake = false;
export async function wakeServer(): Promise<void> {
  if (serverAwake) return;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);
    const res = await fetch(`${API_BASE}/api/health`, {
      method: 'GET',
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (res.ok) {
      serverAwake = true;
      setTimeout(() => { serverAwake = false; }, 5 * 60 * 1000);
    }
  } catch {
    // proceed anyway
  }
}

/**
 * Enhanced fetch for binary uploads (images, files).
 * Uploads go through the Express server as a proxy.
 *
 * CRITICAL: Do NOT add `credentials: 'include'` here.
 * On Android WebView, credentials + cross-origin binary POST = "Failed to fetch".
 * Auth is via Authorization Bearer header, not cookies.
 */
export async function apiUpload(
  path: string,
  options: RequestInit = {},
  timeoutMs: number = 120000,
  retries: number = 1
): Promise<any> {
  const url = `${API_BASE}${path}`;
  const method = options.method || 'POST';
  console.log(`[apiUpload] ${method} ${url}`);
  let lastError;

  for (let i = 0; i <= retries; i++) {
    const { controller, timeoutId } = createTimeoutController(timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Accept': 'application/json',
          ...options.headers,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      console.log(`[apiUpload] ${method} ${url} -> ${response.status}`);
      
      const data = await safeParseJson(response);

      if (!response.ok) {
        const errorMsg = data?.details || data?.error || data?.message || `Upload failed with status ${response.status}`;
        console.error(`[apiUpload] Error response:`, errorMsg);
        throw new Error(errorMsg);
      }
      
      return data;
    } catch (error: any) {
      clearTimeout(timeoutId);
      lastError = error;
      console.error(`[apiUpload] ${method} ${url} attempt ${i + 1} failed:`, error.message);

      if (i === retries) throw error;
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  throw lastError;
}
