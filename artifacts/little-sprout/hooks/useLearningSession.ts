import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createLearningSession, setAuthTokenGetter } from '@workspace/api-client-react';

const TOKEN_KEY = 'little-sprout.learning.token';
export const PENDING_KEY = 'little-sprout.learning.pending-attempt';

let activeToken: string | null = null;
setAuthTokenGetter(() => activeToken);

export function useLearningSession() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busy = useRef(false);
  const unpersistedToken = useRef<string | null>(null);

  const bootstrap = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    setError(null);
    try {
      const stored = await AsyncStorage.getItem(TOKEN_KEY);
      if (stored) {
        activeToken = stored;
      } else {
        // A failed storage write must not silently create a second child on Retry.
        const token = unpersistedToken.current ?? (await createLearningSession()).token;
        unpersistedToken.current = token;
        await AsyncStorage.setItem(TOKEN_KEY, token);
        activeToken = token;
        unpersistedToken.current = null;
      }
      setReady(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save your device profile. Please retry.');
    } finally {
      busy.current = false;
    }
  }, []);

  useEffect(() => { void bootstrap(); }, [bootstrap]);
  return { ready, error, retry: bootstrap };
}