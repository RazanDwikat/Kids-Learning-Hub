import React, { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Ellipse, G, Path, Rect, Text as SvgText } from 'react-native-svg';
import { setAudioModeAsync } from 'expo-audio';
import { useStoryAudio } from '@/components/useStoryAudio';
import colors from '@/constants/colors';
import { STORY_TRACKS, type Beat } from '@/constants/lessonMedia';

const C = colors.light;
const FUR = '#f7efe3', FUR_EDGE = '#d8c6ae', MOM = '#e6d3bb', MOM_EDGE = '#bfa283', PINK = '#f2a5a8', SCARF = '#d9677c';
const clamp = (v: number) => Math.max(0, Math.min(1, v));
const ease = (x: number) => (x < .5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;

type Timeline = { p: (k: string) => number; on: (k: string) => boolean; active: (k: string) => boolean; start: (k: string) => number };
function timeline(beats: Beat[], t: number): Timeline {
  const map = new Map(beats.map(b => [b.key, b]));
  const get = (k: string) => map.get(k) ?? { key: k, start: Infinity, end: Infinity, text: '' };
  return {
    p: k => { const b = get(k); return clamp((t - b.start) / Math.max(.01, b.end - b.start)); },
    on: k => t >= get(k).start,
    active: k => { const b = get(k); return t >= b.start && t < b.end; },
    start: k => get(k).start,
  };
}

function Bunny({ x, y, s = 1, t, mother = false, headTilt = 0, arm = 0, happy = false, earPerk = 0 }: { x: number; y: number; s?: number; t: number; mother?: boolean; headTilt?: number; arm?: number; happy?: boolean; earPerk?: number }) {
  const fur = mother ? MOM : FUR, edge = mother ? MOM_EDGE : FUR_EDGE;
  const breathe = 1 + Math.sin(t * 2.4 + (mother ? 1 : 0)) * .025;
  const sway = Math.sin(t * 1.7 + (mother ? 2 : 0)) * 6;
  const blink = (t + (mother ? .7 : 0)) % 3.3 < .13 ? .15 : 1;
  return <G transform={`translate(${x} ${y}) scale(${s})`}>
    <Ellipse cx={0} cy={2} rx={30} ry={5} fill="#29403a" opacity={.12} />
    <Ellipse cx={-14} cy={-4} rx={13} ry={6} fill={fur} stroke={edge} strokeWidth={1.5} />
    <Ellipse cx={14} cy={-4} rx={13} ry={6} fill={fur} stroke={edge} strokeWidth={1.5} />
    <G transform={`scale(1 ${breathe})`}>
      <Ellipse cx={0} cy={-30} rx={26} ry={30} fill={fur} stroke={edge} strokeWidth={1.5} />
      <Ellipse cx={0} cy={-24} rx={15} ry={18} fill="#fffaf1" />
    </G>
    <G transform={`translate(-21 -40) rotate(${20 - arm * .4})`}><Ellipse cx={0} cy={11} rx={6.5} ry={13} fill={fur} stroke={edge} strokeWidth={1.5} /></G>
    <G transform={`translate(21 -40) rotate(${-20 - arm})`}><Ellipse cx={0} cy={11} rx={6.5} ry={13} fill={fur} stroke={edge} strokeWidth={1.5} /></G>
    <G transform={`translate(0 -64) rotate(${headTilt})`}>
      <G transform={`translate(-10 -16) rotate(${-10 - sway - earPerk})`}><Ellipse cx={0} cy={-22} rx={8} ry={24} fill={fur} stroke={edge} strokeWidth={1.5} /><Ellipse cx={0} cy={-21} rx={4} ry={17} fill={PINK} /></G>
      <G transform={`translate(10 -16) rotate(${10 + sway * .7 + earPerk})`}><Ellipse cx={0} cy={-22} rx={8} ry={24} fill={fur} stroke={edge} strokeWidth={1.5} /><Ellipse cx={0} cy={-21} rx={4} ry={17} fill={PINK} /></G>
      {mother && <G transform="translate(14 -34)"><Circle cx={0} cy={0} r={5} fill={C.butter} /><Circle cx={-5} cy={0} r={4} fill="#fff4d6" /><Circle cx={5} cy={0} r={4} fill="#fff4d6" /><Circle cx={0} cy={-5} r={4} fill="#fff4d6" /><Circle cx={0} cy={5} r={4} fill="#fff4d6" /><Circle cx={0} cy={0} r={3} fill={C.butter} /></G>}
      <Circle cx={0} cy={0} r={24} fill={fur} stroke={edge} strokeWidth={1.5} />
      <Ellipse cx={-8} cy={-3} rx={3} ry={3.4 * blink} fill="#29403a" />
      <Ellipse cx={8} cy={-3} rx={3} ry={3.4 * blink} fill="#29403a" />
      <Circle cx={-15} cy={6} r={4.5} fill={PINK} opacity={.55} />
      <Circle cx={15} cy={6} r={4.5} fill={PINK} opacity={.55} />
      <Ellipse cx={0} cy={5} rx={3} ry={2.2} fill="#d9788a" />
      <Path d={happy ? 'M-7 10 Q0 19 7 10' : 'M-4 10 Q0 13 4 10'} stroke="#29403a" strokeWidth={1.8} fill={happy ? '#e98a96' : 'none'} strokeLinecap="round" />
    </G>
    {mother && <Path d="M-20 -52 Q0 -42 20 -52 L22 -46 Q0 -35 -22 -46 Z M10 -45 L20 -24 L12 -22 L5 -43 Z" fill={SCARF} />}
  </G>;
}

function Apple({ x, y, s = 1, lit = false, label, counted = false }: { x: number; y: number; s?: number; lit?: boolean; label?: string; counted?: boolean }) {
  if (s <= .01) return null;
  return <G transform={`translate(${x} ${y}) scale(${s * (lit ? 1.25 : 1)})`}>
    {lit && <Circle cx={0} cy={0} r={20} fill={C.butter} />}
    {counted && !lit && <Circle cx={0} cy={0} r={17} fill={C.mint} />}
    <Path d="M0 -9 C-9 -15 -16 -6 -14 3 C-12 12 -5 15 0 12 C5 15 12 12 14 3 C16 -6 9 -15 0 -9 Z" fill={C.coral} />
    <Ellipse cx={-6} cy={-3} rx={3} ry={4.5} fill="#fff" opacity={.35} />
    <Path d="M0 -9 L1 -15" stroke="#6b4b36" strokeWidth={2} strokeLinecap="round" />
    <Path d="M1 -13 Q8 -19 11 -12 Q5 -10 1 -13 Z" fill={C.primary} />
    {label && <SvgText x={0} y={-24} fontSize={17} fontFamily="Fredoka SemiBold" fontWeight="600" fill={C.primary} textAnchor="middle">{label}</SvgText>}
  </G>;
}

function Backdrop({ t }: { t: number }) {
  const sway = Math.sin(t * 1.1) * 2;
  return <>
    <Ellipse cx={180} cy={290} rx={260} ry={80} fill="#cfe6c9" />
    <Ellipse cx={60} cy={250} rx={140} ry={40} fill="#bddcb6" opacity={.6} />
    <Rect x={22} y={110} width={12} height={120} rx={5} fill="#b98a66" />
    <G transform={`rotate(${sway} 28 110)`}>
      <Circle cx={28} cy={92} r={40} fill="#9cc99a" /><Circle cx={-2} cy={112} r={26} fill="#8fbe8f" /><Circle cx={58} cy={108} r={26} fill="#a8d2a3" />
      <Circle cx={14} cy={86} r={5} fill={C.coral} /><Circle cx={46} cy={100} r={5} fill={C.coral} /><Circle cx={30} cy={118} r={5} fill={C.coral} />
    </G>
    <Circle cx={318} cy={44} r={20} fill={C.butter} opacity={.9} />
    <G transform={`translate(${((t * 9) % 460) - 60} 0)`}><Ellipse cx={0} cy={56} rx={26} ry={10} fill="#fffdf7" opacity={.85} /><Ellipse cx={16} cy={50} rx={16} ry={10} fill="#fffdf7" opacity={.85} /></G>
  </>;
}

function Confetti({ t, from }: { t: number; from: number }) {
  if (t < from) return null;
  const e = t - from;
  const tints = [C.coral, C.butter, C.primary, '#b69bd8', '#7fc3a8'];
  return <>{Array.from({ length: 18 }, (_, i) => {
    const x = (i * 53) % 350 + 5, y = -10 + ((e * (70 + (i % 5) * 12) + i * 17) % 270);
    return <Rect key={i} x={-4} y={-2} width={8} height={4} rx={1} fill={tints[i % 5]} transform={`translate(${x + Math.sin(e * 3 + i) * 8} ${y}) rotate(${e * 200 + i * 40})`} />;
  })}</>;
}

function Equation({ tl }: { tl: Timeline }) {
  if (!tl.on('equation')) return null;
  const p = tl.p('equation');
  const parts = ['2', '+', '2', '=', '4'];
  return <G>
    <Rect x={95} y={20} width={170} height={52} rx={22} fill="#fffdf7" opacity={ease(clamp(p * 4))} />
    {parts.map((c, i) => { const a = ease(clamp(p * 2.5 - i * .3)); return <SvgText key={i} x={125 + i * 28} y={58 - (1 - a) * 12} opacity={a} fontSize={32} fontFamily="Fredoka SemiBold" fontWeight="600" fill={i === 4 ? C.coral : C.primary} textAnchor="middle">{c}</SvgText>; })}
  </G>;
}

const countOf = (tl: Timeline) => ['count1', 'count2', 'count3', 'count4'].findIndex(k => tl.active(k));
const countedOf = (tl: Timeline, i: number) => tl.on(`count${i + 1}`);

function StoryArt({ t, beats }: { t: number; beats: Beat[] }) {
  const tl = timeline(beats, t);
  const meet = ease(tl.p('meet'));
  const hop = tl.p('happy') > 0 && tl.p('happy') < 1 ? Math.abs(Math.sin(tl.p('happy') * Math.PI * 3)) * 34 : tl.on('celebrate') ? Math.abs(Math.sin((t - tl.start('celebrate')) * 5)) * 14 : 0;
  const walkHop = meet < 1 ? Math.abs(Math.sin(meet * Math.PI * 4)) * 12 : 0;
  const bx = lerp(-60, 92, meet);
  const look = tl.on('mother') ? 10 : 14 * ease(clamp(tl.p('look') * 2));
  const mIn = ease(tl.p('mother')), give = ease(tl.p('give')), tog = ease(tl.p('together'));
  const mx = lerp(430, 272, mIn) + 16 * tog;
  const mWalk = mIn > 0 && mIn < 1 ? Math.abs(Math.sin(mIn * Math.PI * 4)) * 8 : 0;
  const lit = countOf(tl);
  const row = [140, 168, 196, 224];
  const two = ease(tl.p('two'));
  const apples = [0, 1, 2, 3].map(i => {
    if (i < 2) return { x: lerp([134, 158][i], row[i], tog), y: 222, s: ease(clamp(two * 1.6 - i * .5)) };
    const hx = mx - 30, hy = 186 - mWalk;
    const tx = [186, 208][i - 2];
    const gp = clamp(give * 1.3 - (i - 2) * .3);
    const x = lerp(hx + (i - 2) * 12, tx, ease(gp)), y = lerp(hy, 222, ease(gp)) - Math.sin(gp * Math.PI) * 46;
    return { x: lerp(x, row[i], tog), y, s: mIn > 0 ? 1 : 0 };
  });
  return <>
    <Backdrop t={t} />
    {tog > 0 && <Ellipse cx={182} cy={224} rx={lerp(20, 64, tog)} ry={22} fill="#fffdf7" opacity={.55 * tog} />}
    <Bunny x={mx} y={228 - mWalk - (tl.on('celebrate') ? Math.abs(Math.sin((t - tl.start('celebrate')) * 4 + 1)) * 8 : 0)} s={1.28} t={t} mother arm={mIn > 0 && give < 1 ? 55 * (1 - give * .4) : 0} headTilt={-8} happy={tl.on('happy')} />
    <Bunny x={bx} y={228 - walkHop - hop} t={t} headTilt={look} arm={tl.on('happy') ? 120 : 0} happy={tl.on('happy')} earPerk={tl.on('happy') ? 8 : 0} />
    {apples.map((a, i) => <Apple key={i} x={a.x} y={a.y} s={a.s} lit={lit === i} counted={countedOf(tl, i)} label={lit === i ? String(i + 1) : undefined} />)}
    <Equation tl={tl} />
    <Confetti t={t} from={tl.start('celebrate')} />
  </>;
}

function GroupsArt({ t, beats }: { t: number; beats: Beat[] }) {
  const tl = timeline(beats, t);
  const intro = ease(tl.p('intro'));
  const tog = ease(tl.p('together'));
  const cel = tl.on('celebrate') ? Math.abs(Math.sin((t - tl.start('celebrate')) * 5)) * 26 : 0;
  const lit = countOf(tl);
  const start = [132, 158, 250, 276], end = [158, 184, 210, 236];
  const pop = [tl.p('two'), tl.p('two'), tl.p('more'), tl.p('more')];
  const plus = ease(clamp(tl.p('more') * 2)) * (1 - tog);
  return <>
    <Backdrop t={t} />
    <Ellipse cx={145} cy={216} rx={30} ry={24} fill="none" stroke={C.primary} strokeWidth={2} strokeDasharray="5 5" opacity={ease(tl.p('two')) * (1 - tog)} />
    <Ellipse cx={263} cy={216} rx={30} ry={24} fill="none" stroke={C.coral} strokeWidth={2} strokeDasharray="5 5" opacity={ease(tl.p('more')) * (1 - tog)} />
    <Ellipse cx={197} cy={216} rx={lerp(30, 64, tog)} ry={26} fill="#fffdf7" opacity={.6 * tog} />
    <SvgText x={204} y={227} fontSize={34} fontFamily="Fredoka SemiBold" fontWeight="600" fill={C.primary} textAnchor="middle" opacity={plus}>+</SvgText>
    <Bunny x={lerp(-60, 62, intro)} y={228 - (intro < 1 ? Math.abs(Math.sin(intro * Math.PI * 4)) * 12 : 0) - cel} t={t} headTilt={tl.on('two') ? 12 : 0} arm={tl.on('celebrate') ? 120 : tl.active('intro') ? 60 * Math.abs(Math.sin(t * 4)) : 0} happy={tl.on('equation')} earPerk={tl.on('celebrate') ? 8 : 0} />
    {start.map((x, i) => { const p = clamp(pop[i] * 1.6 - (i % 2) * .5); return <Apple key={i} x={lerp(x, end[i], tog)} y={216 - Math.sin(tog * Math.PI) * (i < 2 ? 0 : 20)} s={p < 1 ? ease(p) * (1 + Math.sin(p * Math.PI) * .3) : 1} lit={lit === i} counted={countedOf(tl, i)} label={lit === i ? String(i + 1) : undefined} />; })}
    <Equation tl={tl} />
    <Confetti t={t} from={tl.start('celebrate')} />
  </>;
}

let audioModeSet = false;
type Props = { onRetry: () => void; kind: 'story' | 'groups'; playing: boolean; muted: boolean; resumePercent: number; replayKey: number; onProgress: (pct: number) => void; onEnded: () => void; onBlocked: () => void; onError: () => void };

function Player({ kind, playing, muted, resumePercent, replayKey, onProgress, onEnded, onBlocked, onError, onRetry, blocked }: Props & { blocked: boolean }) {
  const track = STORY_TRACKS[kind];
  const { player, status } = useStoryAudio(track.source);
  const duration = status.duration > 0 ? status.duration : track.duration;
  const [t, setT] = useState(0);
  const [failed, setFailed] = useState(false);
  const anchor = useRef({ time: 0, at: Date.now() });
  const seeked = useRef(false);
  const cb = useRef({ onProgress, onEnded, onBlocked, onError });
  cb.current = { onProgress, onEnded, onBlocked, onError };

  useEffect(() => { if (!audioModeSet && Platform.OS !== 'web') { audioModeSet = true; void setAudioModeAsync({ playsInSilentMode: true }).catch(() => {}); } }, []);
  useEffect(() => { anchor.current = { time: status.currentTime, at: Date.now() }; if (!status.playing || status.buffering) setT(status.currentTime); }, [status.currentTime, status.playing, status.buffering]);
  // Visual clock interpolates between real player position reports; it never runs ahead of audio while paused.
  useEffect(() => {
    if (!status.playing || status.buffering) return;
    let raf = 0;
    const tick = () => { setT(Math.min(duration, anchor.current.time + (Date.now() - anchor.current.at) / 1000)); raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [status.playing, status.buffering, duration]);
  useEffect(() => { if (duration > 0) cb.current.onProgress(Math.min(100, (t / duration) * 100)); }, [Math.floor(t * 4)]);
  useEffect(() => { if (status.didJustFinish) { setT(duration); cb.current.onEnded(); } }, [status.didJustFinish]);
  useEffect(() => { if (status.error) { setFailed(true); cb.current.onError(); } }, [status.error]);
  useEffect(() => {
    if (status.isLoaded) return;
    const timer = setTimeout(() => { setFailed(true); cb.current.onError(); }, 12000);
    return () => clearTimeout(timer);
  }, [status.isLoaded]);
  useEffect(() => { player?.setMuted(muted); }, [muted, player]);
  useEffect(() => {
    if (!status.isLoaded || !player) return;
    let cancelled = false;
    const run = async () => {
      if (!seeked.current) { seeked.current = true; const at = resumePercent > 0 && resumePercent < 100 ? (resumePercent / 100) * duration : 0; if (at > 0) await player.seekTo(at); }
      if (cancelled) return;
      if (!playing) { player.pause(); return; }
      if (player.currentTime >= duration - .15) await player.seekTo(0);
      if (cancelled || player.playing) return;
      try { await player.play(); } catch (e) {
        if (cancelled) return;
        if (e instanceof Error && e.name === 'NotAllowedError') cb.current.onBlocked(); else cb.current.onError();
      }
    };
    void run().catch(() => { if (!cancelled) cb.current.onError(); });
    return () => { cancelled = true; };
  }, [playing, status.isLoaded, player]);
  useEffect(() => {
    if (!replayKey || !status.isLoaded || !player) return;
    void player.seekTo(0).then(() => { setT(0); if (playing) return player.play(); }).catch(() => cb.current.onBlocked());
  }, [replayKey]);
  useEffect(() => () => { player?.pause(); }, [player]);
  // Called directly from the overlay's onPress so media.play() runs inside the user gesture.
  const startFromGesture = () => {
    if (!player) return;
    if (player.currentTime >= duration - .15) void player.seekTo(0);
    const attempt = player.play();
    onRetry();
    attempt.catch(() => cb.current.onBlocked());
  };

  const current = [...track.beats].reverse().find(b => t >= b.start) ?? null;
  const Art = kind === 'story' ? StoryArt : GroupsArt;
  return <View style={st.wrap} testID={`story-scene-${kind}`}>
    <View style={st.stage}>
      <Svg width="100%" height="100%" viewBox="0 0 360 260" preserveAspectRatio="xMidYMid meet"><Art t={t} beats={track.beats} /></Svg>
      {(!status.isLoaded || status.buffering) && !failed && <View style={st.overlay}><Text style={st.overlayText}>Getting Bunny’s story ready…</Text></View>}
      {failed && <View style={st.overlay}><Text style={st.overlayText}>The story sound could not load.</Text></View>}
    </View>
    {blocked && <Pressable testID="story-tap-to-play" accessibilityRole="button" accessibilityLabel="Tap to play the story with sound" onPress={startFromGesture} style={st.blocked}><Text style={st.blockedText}>Tap here to hear Bunny’s story</Text></Pressable>}
    <Text testID="story-caption" accessibilityLiveRegion="polite" style={st.caption}>{!playing && t > 0 && t < duration - .15 ? 'Paused. Your apples will wait for you.' : current?.text ?? 'Tap play to begin the story.'}</Text>
  </View>;
}

export function StoryScene(props: Props & { blocked: boolean; retryKey: number }) {
  const { retryKey, ...rest } = props;
  return <View style={{ flex: 1, width: '100%' }}><Player key={retryKey} {...rest} /></View>;
}

const st = StyleSheet.create({
  wrap: { flex: 1, width: '100%', alignItems: 'center' },
  stage: { flex: 1, width: '100%', minHeight: 180 },
  overlay: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  overlayText: { fontFamily: 'DM Sans Bold', color: C.primary, fontSize: 13, backgroundColor: C.paper, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, overflow: 'hidden' },
  caption: { fontFamily: 'Fredoka SemiBold', color: C.foreground, fontSize: 19, lineHeight: 24, textAlign: 'center', backgroundColor: C.paper, borderRadius: 20, overflow: 'hidden', paddingHorizontal: 16, paddingVertical: 9, marginTop: 6, minHeight: 42 },
  blocked: { position: 'absolute', alignSelf: 'center', top: '38%', backgroundColor: C.coral, borderRadius: 22, paddingHorizontal: 18, paddingVertical: 12 },
  blockedText: { fontFamily: 'DM Sans Bold', color: C.paper, fontSize: 14 },
});
