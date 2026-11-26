import { setBaseUrl } from '@workspace/api-client-react';
import { Platform } from 'react-native';

const REQUEST_TIMEOUT_MS = 12000;
const NETWORK_MESSAGE = 'Could not connect to your garden. Check your connection and tap Retry.';
const TIMEOUT_MESSAGE = 'The connection took too long. Tap Retry to try again.';

// Set this to the API origin (without the /api path). Web can also use its
// current origin when a server or reverse proxy exposes the API at /api.
const configuredApiUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
let apiOrigin: string | null = null;

if (configuredApiUrl) {
  try {
    const url = new URL(configuredApiUrl);
    if (
      (url.protocol === 'http:' || url.protocol === 'https:') &&
      url.pathname === '/' &&
      !url.search &&
      !url.hash &&
      !url.username &&
      !url.password
    ) {
      apiOrigin = url.origin;
    }
  } catch {
    // Report a clear configuration error below rather than failing a request.
  }
}

export const apiConfigError = (configuredApiUrl && !apiOrigin) ||
  (Platform.OS !== 'web' && !apiOrigin)
  ? 'Set EXPO_PUBLIC_API_URL to the API origin, such as http://localhost:8080.'
  : null;

export function configureLearningApi() {
  setBaseUrl(apiOrigin);
}

export function isNetworkError(error: unknown) {
  return error instanceof TypeError &&
    /failed to fetch|network request failed|network error|load failed/i.test(error.message);
}

export function learningRequestError(error: unknown, fallback: string) {
  if (error instanceof Error && error.message === TIMEOUT_MESSAGE) return TIMEOUT_MESSAGE;
  if (isNetworkError(error)) return NETWORK_MESSAGE;
  return error instanceof Error ? error.message : fallback;
}

// Use generated endpoint request options, retaining React Query cancellation when present.
export async function withRequestTimeout<T>(
  request: (signal: AbortSignal) => Promise<T>,
  parentSignal?: AbortSignal,
): Promise<T> {
  const controller = new AbortController();
  let timedOut = false;
  const onAbort = () => controller.abort();
  if (parentSignal?.aborted) onAbort();
  else parentSignal?.addEventListener('abort', onAbort);
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, REQUEST_TIMEOUT_MS);
  try {
    return await request(controller.signal);
  } catch (error) {
    if (timedOut) throw new Error(TIMEOUT_MESSAGE);
    throw error;
  } finally {
    clearTimeout(timer);
    parentSignal?.removeEventListener('abort', onAbort);
  }
}