/**
 * API Client Configuration
 * 
 * Handles the difference between:
 * - Web (Vercel hosted): relative /api/... paths work because Vercel rewrites them
 * - Web (dev server): Vite proxy forwards /api/... to localhost:3000
 * - Android (Capacitor WebView): Must use absolute URLs to the production backend
 * 
 * IMPORTANT: Update PRODUCTION_API_URL to match your actual Vercel deployment URL.
 */

// ──────────────────────────────────────────────────────
// 🔧 SET YOUR PRODUCTION BACKEND URL HERE
// This is your Vercel deployment URL (the domain where your API is hosted).
// Example: "https://ethiocars.vercel.app" or "https://your-custom-domain.com"
// ──────────────────────────────────────────────────────
const PRODUCTION_API_URL = 'https://ethio-cars.vercel.app';

/**
 * Detect if the app is running inside a Capacitor native WebView.
 * In Capacitor, the origin is "capacitor://localhost" (iOS) or "http://localhost" (Android),
 * and the window.Capacitor object is injected.
 */
function isNativeApp(): boolean {
  // Check for Capacitor bridge
  if (typeof (window as any).Capacitor !== 'undefined') {
    return true;
  }
  // Fallback: check if served from capacitor:// or local file
  if (typeof window !== 'undefined') {
    const origin = window.location.origin;
    if (
      origin.startsWith('capacitor://') ||
      origin.startsWith('file://') ||
      origin === 'http://localhost' ||  // Android Capacitor default
      origin === 'https://localhost'    // iOS Capacitor default
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Get the base URL for API requests.
 * - In native apps → full production URL
 * - In web (hosted or dev) → empty string (relative paths work)
 */
function getApiBaseUrl(): string {
  if (isNativeApp()) {
    return PRODUCTION_API_URL;
  }
  // On web (Vercel or dev server), relative paths work fine
  return '';
}

/**
 * The resolved API base URL. Computed once at module load.
 */
export const API_BASE = getApiBaseUrl();

/**
 * Default request timeout in milliseconds.
 * Android network requests may take longer, so we use a generous timeout.
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
  
  // Check if the response is actually JSON
  if (contentType && contentType.includes('application/json')) {
    return response.json();
  }
  
  // If not JSON, read as text and throw a descriptive error
  const text = await response.text();
  
  // Check if it's an HTML page (common when API URL resolves incorrectly)
  if (text.trim().startsWith('<!') || text.trim().startsWith('<html')) {
    throw new Error(
      'Server returned an HTML page instead of JSON. ' +
      'This usually means the API URL is incorrect. ' +
      `Status: ${response.status}, URL: ${response.url}`
    );
  }
  
  // Try to parse as JSON anyway (some servers don't set content-type correctly)
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
 * Similar to apiFetch but returns the raw Response for custom handling.
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
