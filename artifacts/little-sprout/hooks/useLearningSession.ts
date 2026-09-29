import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createLearningSession, setAuthTokenGetter } from '@workspace/api-client-react';
import { apiConfigError, learningRequestError, withRequestTimeout } from './learningNetwork';

const TOKEN_KEY = 'little-sprout.learning.token';
export const PENDING_KEY = 'little-sprout.learning.pending-attempt';

let activeToken: string | null = null;
let unpersistedToken: string | null = null;
setAuthTokenGetter(() => activeToken);

export function useLearningSession() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const busy = useRef(false);

  const bootstrap = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    setLoading(true);
    setError(null);
    try {
      if (apiConfigError) throw new Error(apiConfigError);
      const stored = await AsyncStorage.getItem(TOKEN_KEY);
      if (stored) {
        activeToken = stored;
      } else {
        // A failed storage write must not silently create a second child on Retry.
        const token = unpersistedToken ?? (await withRequestTimeout(signal => createLearningSession({ signal }))).token;
        unpersistedToken = token;
        activeToken = token;
        await AsyncStorage.setItem(TOKEN_KEY, token);
        unpersistedToken = null;
      }
      setReady(true);
    } catch (e) {
      setError(learningRequestError(e, 'Could not save your device profile. Please retry.'));
    } finally {
      busy.current = false;
      setLoading(false);
    }
  }, []);

  useEffect(() => { void bootstrap(); }, [bootstrap]);
  return { ready, error, loading, retry: bootstrap };
}