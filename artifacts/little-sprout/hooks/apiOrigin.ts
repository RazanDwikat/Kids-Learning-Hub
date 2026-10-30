/** Accept only explicit origins; never send a device token to a guessed host. */
export function nativeApiOrigin(value: string | undefined, development: boolean): string | null {
  try {
    if (!value) return null;
    const url = new URL(value);
    if (url.username || url.password || url.search || url.hash || url.pathname !== '/') return null;
    if (url.protocol !== 'https:' && !(development && url.protocol === 'http:')) return null;
    return url.origin;
  } catch { return null; }
}
