// Platform-neutral audio contract plus a web implementation over a plain media element.
// Kept free of imports so it can be tested with `node --test` directly.
export type StoryAudioStatus = { isLoaded: boolean; playing: boolean; buffering: boolean; currentTime: number; duration: number; didJustFinish: boolean; error: string | null };
export type StoryAudioPlayer = {
  /** Resolves once audio is actually playing; rejects when the platform refuses (e.g. no user gesture). */
  play(): Promise<void>;
  pause(): void;
  seekTo(seconds: number): Promise<void>;
  setMuted(muted: boolean): void;
  readonly playing: boolean;
  readonly currentTime: number;
};
export const initialStatus: StoryAudioStatus = { isLoaded: false, playing: false, buffering: false, currentTime: 0, duration: 0, didJustFinish: false, error: null };

export type MediaLike = {
  src: string; currentTime: number; duration: number; muted: boolean; paused: boolean; preload: string;
  play(): Promise<void> | void; pause(): void; load(): void; removeAttribute(name: string): void;
  addEventListener(type: string, fn: () => void): void; removeEventListener(type: string, fn: () => void): void;
};

export class WebStoryAudio implements StoryAudioPlayer {
  private el: MediaLike;
  private status: StoryAudioStatus = { ...initialStatus };
  private subs = new Set<(s: StoryAudioStatus) => void>();
  private bound: [string, () => void][] = [];
  private released = false;

  constructor(el: MediaLike, uri: string) {
    this.el = el;
    const dur = () => (Number.isFinite(el.duration) && el.duration > 0 ? el.duration : this.status.duration);
    const on: Record<string, () => void> = {
      loadedmetadata: () => this.set({ duration: dur() }),
      canplay: () => this.set({ isLoaded: true, buffering: false, duration: dur() }),
      playing: () => this.set({ playing: true, buffering: false, didJustFinish: false }),
      pause: () => this.set({ playing: false, currentTime: el.currentTime }),
      waiting: () => this.set({ buffering: true }),
      timeupdate: () => this.set({ currentTime: el.currentTime }),
      seeked: () => this.set({ currentTime: el.currentTime, didJustFinish: false }),
      ended: () => this.set({ playing: false, currentTime: dur(), didJustFinish: true }),
      error: () => this.set({ error: 'Audio could not be loaded.', playing: false }),
    };
    for (const [type, fn] of Object.entries(on)) { el.addEventListener(type, fn); this.bound.push([type, fn]); }
    el.preload = 'auto';
    el.src = uri;
    el.load();
  }
  private set(patch: Partial<StoryAudioStatus>) {
    if (this.released) return;
    this.status = { ...this.status, ...patch };
    this.subs.forEach(fn => fn(this.status));
  }
  getStatus() { return this.status; }
  subscribe(fn: (s: StoryAudioStatus) => void) { this.subs.add(fn); fn(this.status); return () => { this.subs.delete(fn); }; }
  get playing() { return this.status.playing && !this.el.paused; }
  get currentTime() { return this.el.currentTime; }
  play(): Promise<void> {
    if (this.released) return Promise.reject(new Error('released'));
    let result: Promise<void> | void;
    try { result = this.el.play(); } catch (e) { return Promise.reject(e); }
    return Promise.resolve(result).catch((e: unknown) => { this.set({ playing: false }); throw e; });
  }
  pause() { if (!this.released) this.el.pause(); }
  seekTo(seconds: number) { if (!this.released) { this.el.currentTime = seconds; this.set({ currentTime: seconds, didJustFinish: false }); } return Promise.resolve(); }
  setMuted(muted: boolean) { if (!this.released) this.el.muted = muted; }
  release() {
    if (this.released) return;
    this.el.pause();
    this.released = true;
    this.bound.forEach(([t, fn]) => this.el.removeEventListener(t, fn));
    this.subs.clear();
    this.el.removeAttribute('src');
    this.el.load();
  }
}
