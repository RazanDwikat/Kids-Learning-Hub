import { test } from 'node:test';
import assert from 'node:assert/strict';
import { WebStoryAudio } from '../components/storyAudioCore.ts';

function fakeMedia({ reject = false } = {}) {
  const l = {};
  const el = {
    src: '', currentTime: 0, duration: 10, muted: false, paused: true, preload: '', calls: 0, reject,
    play() { el.calls++; if (el.reject) return Promise.reject(Object.assign(new Error('blocked'), { name: 'NotAllowedError' })); el.paused = false; el.emit('playing'); return Promise.resolve(); },
    pause() { el.paused = true; el.emit('pause'); }, load() {}, removeAttribute(n) { if (n === 'src') el.src = ''; },
    addEventListener(t, f) { (l[t] ??= []).push(f); }, removeEventListener(t, f) { l[t] = (l[t] ?? []).filter(x => x !== f); },
    emit(t) { (l[t] ?? []).forEach(f => f()); },
  };
  return el;
}

test('rejected play propagates and leaves status not playing', async () => {
  const el = fakeMedia({ reject: true });
  const a = new WebStoryAudio(el, 'x.wav');
  el.emit('canplay');
  await assert.rejects(a.play(), /blocked/);
  assert.equal(a.getStatus().playing, false);
  assert.equal(a.playing, false);
});

test('gesture retry calls media.play synchronously and reports real playing', async () => {
  const el = fakeMedia({ reject: true });
  const a = new WebStoryAudio(el, 'x.wav');
  await a.play().catch(() => {});
  el.reject = false;
  const before = el.calls;
  const p = a.play();
  assert.equal(el.calls, before + 1, 'play must reach the element within the same tick');
  await p;
  assert.equal(a.getStatus().playing, true);
});

test('status follows media events and release detaches', () => {
  const el = fakeMedia();
  const a = new WebStoryAudio(el, 'x.wav');
  el.emit('waiting'); assert.equal(a.getStatus().buffering, true);
  el.currentTime = 4.2; el.emit('timeupdate'); assert.equal(a.getStatus().currentTime, 4.2);
  el.emit('ended'); assert.equal(a.getStatus().didJustFinish, true);
  a.setMuted(true); assert.equal(el.muted, true);
  a.release(); assert.equal(el.src, '');
  const frozen = a.getStatus().currentTime;
  el.currentTime = 1; el.emit('timeupdate'); assert.equal(a.getStatus().currentTime, frozen);
});
