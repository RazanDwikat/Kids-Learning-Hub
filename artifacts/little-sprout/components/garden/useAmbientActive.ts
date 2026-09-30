import type React from 'react';
import { useEffect, useState } from 'react';
import { AccessibilityInfo, AppState, Dimensions, Platform, View } from 'react-native';

/** Reduced-motion preference (live). */
export function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled().then((v) => { if (alive) setReduced(v); }).catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => { alive = false; sub.remove(); };
  }, []);
  return reduced;
}

/** True while the app is foregrounded and (on web) the document is visible. */
export function useForeground() {
  const [active, setActive] = useState(AppState.currentState !== 'background' && AppState.currentState !== 'inactive');
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => setActive(s === 'active'));
    let off = () => {};
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const on = () => setActive(document.visibilityState !== 'hidden');
      on(); document.addEventListener('visibilitychange', on);
      off = () => document.removeEventListener('visibilitychange', on);
    }
    return () => { sub.remove(); off(); };
  }, []);
  return active;
}

/** Whether the referenced view intersects the viewport. Web: IntersectionObserver. Native: measureInWindow polling while mounted. Defaults to visible. */
export function useInViewport(ref: React.RefObject<View | null>) {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const node = ref.current as unknown;
    if (Platform.OS === 'web') {
      if (!node || typeof IntersectionObserver === 'undefined' || !(node instanceof Element)) return;
      const io = new IntersectionObserver((es) => setVisible(es.some((e) => e.isIntersecting)), { threshold: 0.05 });
      io.observe(node); return () => io.disconnect();
    }
    let alive = true;
    const tick = () => ref.current?.measureInWindow((_x, y, _w, h) => {
      if (!alive || !h) return;
      const wh = Dimensions.get('window').height;
      setVisible(y + h > 0 && y < wh);
    });
    tick(); const id = setInterval(tick, 800);
    return () => { alive = false; clearInterval(id); };
  }, [ref]);
  return visible;
}
