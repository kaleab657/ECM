/**
 * API Client Configuration
 *
 * Handles the difference between:
 * - Web (Render hosted): relative /api/... paths work because frontend + backend are on the same origin
 * - Web (dev server): Vite proxy forwards /api/... to localhost:3000
 * - Android (Capacitor WebView): Must use absolute URLs to the production backend
 *
 * Backend runs on Render: https://ethiocars-9jsd.onrender.com
 */

// ──────────────────────────────────────────────────────
// 🔧 Production backend URL (Render)
// ──────────────────────────────────────────────────────
const PRODUCTION_API_URL = 'https://ethiocars-9jsd.onrender.com';

/**
 * Detect if the app is running inside a Capacitor native WebView.
 * In Capacitor, the origin is "capacitor://localhost" (iOS) or "https://localhost" (Android).
 */
function isNativeApp(): boolean {
  if (typeof (window as any).Capacitor !== 'undefined') {
    return true;
  }
  if (typeof window !== 'undefined') {
    const origin = window.location.origin;
    if (
      origin.startsWith('capacitor://') ||
      origin.startsWith('file://') ||
      origin === 'http://localhost' ||  // Android Capacitor default
      origin === 'https://localhost'    // Android Capacitor with androidScheme=https
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Get the base URL for API requests.
 * - In native apps → full Render production URL (absolute)
 * - In web (Render or dev server) → empty string (relative paths work)
 */
function getApiBaseUrl(): string {
  if (isNativeApp()) {
    return PRODUCTION_API_URL;
  }
  // On web, frontend and backend are on the same Render service
  // so relative /api/... paths work without CORS
  return '';
}

/**
 * The resolved API base URL. Computed once at module load.
 */
export const API_BASE = getApiBaseUrl();

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
 *
 * @param path - The API path (e.g., '/api/listings')
 * @param options - Standard fetch options
 * @param timeoutMs - Request timeout in milliseconds (default: 30s)
 * @returns The parsed JSON response
 */
export async function apiFetch(
  path: string,
  options: RequestInit = {},
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<any> {
  const url = `${API_BASE}${path}`;
  const { controller, timeoutId } = createTimeoutController(timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const data = await safeParseJson(response);

    if (!response.ok) {
      const errorMsg = data?.error || data?.message || `Request failed with status ${response.status}`;
      throw new Error(errorMsg);
    }

    return data;
  } catch (error: any) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      throw new Error(
        'Request timed out. Please check your internet connection and try again.'
      );
    }

    throw error;
  }
}

/**
 * Enhanced fetch for binary uploads (images, files).
 * Uploads go through the Express server as a proxy — no CORS issues.
 *
 * @param path - The API path (e.g., '/api/r2/upload-listing?...')
 * @param options - Standard fetch options (should include body as binary)
 * @param timeoutMs - Request timeout (default: 60s for uploads)
 * @returns The raw Response object
 */
export async function apiUpload(
  path: string,
  options: RequestInit = {},
  timeoutMs: number = 60000 // 60s for uploads
): Promise<Response> {
  const url = `${API_BASE}${path}`;
  const { controller, timeoutId } = createTimeoutController(timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return response;
  } catch (error: any) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      throw new Error(
        'Upload timed out. Please check your internet connection and try again.'
      );
    }

    throw error;
  }
}
