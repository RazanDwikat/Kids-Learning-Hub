import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

const marker = '__littleSproutScreen';
type Entry<S extends string> = { session: string; index: number; screen: S };

/**
 * Screen-only web history. Nothing is put in the URL or restored on reload.
 * All browser navigation goes through the shell's normal save/pause guard.
 */
export function useScreenHistory<S extends string>(
  screen: S,
  home: S,
  allowedScreens: readonly S[],
  navigate: (destination: S) => Promise<boolean>,
) {
  const navigation = useRef(navigate);
  navigation.current = navigate;
  const allowed = useRef(allowedScreens);
  const current = useRef<Entry<S> | null>(null);
  const pending = useRef<Entry<S> | null>(null);
  const skipPush = useRef<S | null>(null);
  const lastScreen = useRef(screen);
  const restoreTarget = useRef<Entry<S> | null>(null);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    let mounted = true;
    const session = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const initial: Entry<S> = { session, index: 0, screen: home };
    current.current = initial;
    window.history.replaceState({ ...window.history.state, [marker]: initial }, '');
    const ownEntry = (state: unknown): Entry<S> | null => {
      const entry = (state as Record<string, unknown> | null)?.[marker] as Entry<S> | undefined;
      return entry?.session === session && Number.isInteger(entry.index) &&
        entry.index >= 0 && allowed.current.includes(entry.screen) ? entry : null;
    };
    const restore = (entry: Entry<S>) => {
      const browser = ownEntry(window.history.state);
      if (!browser || browser.index === entry.index) return;
      restoreTarget.current = entry;
      window.history.go(entry.index - browser.index);
    };
    const onPop = (event: PopStateEvent) => {
      const target = ownEntry(event.state);
      // Do not hijack router, external, or pre-reload history entries.
      if (!target || !current.current) return;
      if (restoreTarget.current) {
        const destination = restoreTarget.current;
        restoreTarget.current = null;
        if (target.index !== destination.index) restore(destination);
        return;
      }
      // Serialize rapid Back/Forward clicks while a lesson exit is saving.
      if (pending.current) { restore(pending.current); return; }
      if (target.index === current.current.index) return;
      pending.current = target;
      skipPush.current = target.screen;
      void navigation.current(target.screen).then(accepted => {
        if (!mounted) return;
        pending.current = null;
        if (accepted) {
          current.current = target;
          if (lastScreen.current === target.screen) skipPush.current = null;
        } else {
          skipPush.current = null;
          // Busy or failed save: return to the actual screen's existing entry,
          // rather than adding a duplicate or losing the Forward stack.
          restore(current.current!);
        }
      }).catch(() => {
        if (!mounted) return;
        pending.current = null;
        skipPush.current = null;
        restore(current.current!);
      });
    };
    window.addEventListener('popstate', onPop);
    return () => { mounted = false; window.removeEventListener('popstate', onPop); };
  }, [home]);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined' || !current.current ||
        screen === lastScreen.current) return;
    lastScreen.current = screen;
    if (skipPush.current === screen) { skipPush.current = null; return; }
    // Expo Router may initialize its root history entry after this child hook's
    // mount effect. Stamp the entry we are leaving as well, so the first Back
    // still belongs to this screen stack.
    const browserState = window.history.state ?? {};
    if (browserState[marker]?.session !== current.current.session) {
      window.history.replaceState({ ...browserState, [marker]: current.current }, '');
    }
    const entry: Entry<S> = { ...current.current, screen, index: current.current.index + 1 };
    current.current = entry;
    window.history.pushState({ ...window.history.state, [marker]: entry }, '');
  }, [screen]);
}