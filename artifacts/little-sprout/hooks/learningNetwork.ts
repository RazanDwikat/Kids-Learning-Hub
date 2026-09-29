import { setBaseUrl } from '@workspace/api-client-react';
import { Platform } from 'react-native';

const REQUEST_TIMEOUT_MS = 12000;
const NETWORK_MESSAGE = 'Could not connect to your garden. Check your connection and tap Retry.';
const TIMEOUT_MESSAGE = 'The connection took too long. Tap Retry to try again.';

// Native bundles need an absolute API origin. Web uses its own origin: the
// preview gateway already routes /api to Express, without a cross-site fetch.
const domain = process.env.EXPO_PUBLIC_DOMAIN;
const validDomain = typeof domain === 'string' &&
  domain.length <= 253 &&
  (domain === 'localhost' || domain.split('.').length >= 2) &&
  domain.split('.').every(label => /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/.test(label));

export const apiConfigError = Platform.OS === 'web' || validDomain
  ? null
  : 'The garden connection is not configured. Please reopen the preview or contact support.';

export function configureLearningApi() {
  setBaseUrl(Platform.OS === 'web' ? null : validDomain ? `https://${domain}` : null);
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