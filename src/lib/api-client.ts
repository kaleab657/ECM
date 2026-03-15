/**
 * API Client Configuration
 *
 * Handles the difference between:
 * - Web (Render hosted): relative /api/... paths work because frontend + backend are on the same origin
 * - Web (dev server): Vite proxy forwards /api/... to localhost:3000
 *
 * Backend runs on Render: https://ethiocars-9jsd.onrender.com
 */

/**
 * Get the base URL for API requests.
 * Since this is now a pure web app, we always use relative paths.
 */
export const API_BASE = '';

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
  let lastError;

  for (let i = 0; i <= retries; i++) {
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
      lastError = error;

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
 * Enhanced fetch for binary uploads (images, files).
 * Uploads go through the Express server as a proxy — no CORS issues.
 */
export async function apiUpload(
  path: string,
  options: RequestInit = {},
  timeoutMs: number = 60000,
  retries: number = 1
): Promise<Response> {
  const url = `${API_BASE}${path}`;
  let lastError;

  for (let i = 0; i <= retries; i++) {
    const { controller, timeoutId } = createTimeoutController(timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      
      if (response.ok || i === retries) {
        return response;
      }
      
      // If we got a server error, we might want to retry choice errors
      if (response.status >= 500) {
         throw new Error(`Server error ${response.status}`);
      }
      
      return response;
    } catch (error: any) {
      clearTimeout(timeoutId);
      lastError = error;

      if (i === retries) throw error;
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  throw lastError;
}
