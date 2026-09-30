import React, { memo } from 'react';
import Svg, { Circle, Ellipse, G, Path, Rect, Defs, LinearGradient, Stop } from 'react-native-svg';
import { C } from './ui';

// Scene palette derived from brand tokens (no raw hex outside this map file set).
export const M = {
  grass: '#a9d8a0', grassDeep: '#8cc68a', grassLight: '#c6e7b8',
  water: '#9fd3e3', waterDeep: '#7fbfd6', foam: '#e8f6f8',
  path: '#fbf1d9', pathEdge: '#e8d9b4', dash: '#e2cfa1',
  trunk: '#a87b58', roof: C.coral, wall: C.butter, stone: '#c9cfc4', stoneDark: '#a9b3a6',
  pine: C.primary, pineLight: '#5b9a86', leaf: '#6fae7c', flower: C.lilac,
};

export type Pt = { x: number; y: number };
export const STOP_GAP = 150;
export const TOP_PAD = 90;
export const BOTTOM_PAD = 120;

/** Stop centres for `count` nodes (stops + treasure), bottom-to-top? No: top-to-bottom reading order. */
export function layout(width: number, count: number) {
  const pts: Pt[] = [];
  for (let i = 0; i < count; i++) {
    const phase = i % 4;
    const fx = phase === 0 ? 0.28 : phase === 1 ? 0.72 : phase === 2 ? 0.7 : 0.3;
    pts.push({ x: width * (i % 2 ? Math.max(fx, 0.68) : Math.min(fx, 0.32)), y: TOP_PAD + i * STOP_GAP });
  }
  const height = TOP_PAD + (count - 1) * STOP_GAP + BOTTOM_PAD;
  return { pts, height };
}

function ctrl(a: Pt, b: Pt): [Pt, Pt] {
  const dy = (b.y - a.y) * 0.55;
  return [{ x: a.x, y: a.y + dy }, { x: b.x, y: b.y - dy }];
}
export function segmentD(a: Pt, b: Pt) { const [c1, c2] = ctrl(a, b); return `M${a.x} ${a.y} C${c1.x} ${c1.y} ${c2.x} ${c2.y} ${b.x} ${b.y}`; }
export function fullD(pts: Pt[]) {
  if (!pts.length) return '';
  let d = `M${pts[0].x} ${pts[0].y - 70} L${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) { const [c1, c2] = ctrl(pts[i - 1], pts[i]); d += ` C${c1.x} ${c1.y} ${c2.x} ${c2.y} ${pts[i].x} ${pts[i].y}`; }
  return d;
}
/** Samples a chain of bezier segments from stop `from` to stop `to` — the same curve that is rendered. */
export function sampleRoute(pts: Pt[], from: number, to: number, perSeg = 14): Pt[] {
  const out: Pt[] = [];
  for (let i = from; i < to; i++) {
    const a = pts[i], b = pts[i + 1]; const [c1, c2] = ctrl(a, b);
    for (let k = i === from ? 0 : 1; k <= perSeg; k++) {
      const t = k / perSeg, u = 1 - t;
      out.push({ x: u * u * u * a.x + 3 * u * u * t * c1.x + 3 * u * t * t * c2.x + t * t * t * b.x, y: u * u * u * a.y + 3 * u * u * t * c1.y + 3 * u * t * t * c2.y + t * t * t * b.y });
    }
  }
  return out;
}

const Tree = ({ x, y, s = 1 }: Pt & { s?: number }) => <G transform={`translate(${x} ${y}) scale(${s})`}>
  <Ellipse cx={0} cy={4} rx={16} ry={5} fill={M.grassDeep} />
  <Rect x={-3} y={-8} width={6} height={12} rx={2} fill={M.trunk} />
  <Path d="M0 -44 L17 -8 L-17 -8 Z" fill={M.pine} />
  <Path d="M0 -44 L17 -8 L2 -8 Z" fill={M.pineLight} opacity={0.55} />
</G>;
const Bush = ({ x, y, s = 1 }: Pt & { s?: number }) => <G transform={`translate(${x} ${y}) scale(${s})`}>
  <Circle cx={-9} cy={0} r={10} fill={M.leaf} /><Circle cx={8} cy={-1} r={12} fill={M.leaf} /><Circle cx={0} cy={-8} r={11} fill={M.grassLight} opacity={0.7} />
  <Circle cx={5} cy={-6} r={2.4} fill={M.flower} /><Circle cx={-6} cy={-2} r={2} fill={C.butter} />
</G>;
const Flowers = ({ x, y }: Pt) => <G transform={`translate(${x} ${y})`}>{[[0, 0], [9, 5], [-8, 6]].map(([dx, dy], i) => <G key={i}><Circle cx={dx} cy={dy} r={3} fill={i % 2 ? C.butter : C.paper} /><Circle cx={dx} cy={dy} r={1.2} fill={C.coral} /></G>)}</G>;

/** Illustrated landmark per stop — cottage, bridge, castle, woods, mountain, rainbow gate. */
export function Landmark({ kind, x, y, dim }: { kind: number; x: number; y: number; dim: boolean }) {
  const o = dim ? 0.72 : 1;
  switch (kind % 6) {
    case 0: return <G opacity={o} transform={`translate(${x} ${y})`}>
      <Ellipse cx={0} cy={22} rx={40} ry={9} fill={M.grassDeep} />
      <Rect x={-26} y={-8} width={52} height={32} rx={4} fill={M.wall} />
      <Path d="M-34 -6 L0 -36 L34 -6 Z" fill={M.roof} />
      <Path d="M-14 -24 L-6 -30 L-6 -8 L-14 -8Z" fill={C.paper} opacity={0.5} />
      <Rect x={-6} y={6} width={12} height={18} rx={6} fill={M.trunk} />
      <Rect x={12} y={2} width={9} height={9} rx={2} fill={M.water} />
    </G>;
    case 1: return <G opacity={o} transform={`translate(${x} ${y})`}>
      <Path d="M-44 14 Q0 -14 44 14" stroke={M.trunk} strokeWidth={9} fill="none" strokeLinecap="round" />
      <Path d="M-44 14 Q0 -14 44 14" stroke={M.wall} strokeWidth={4} fill="none" strokeDasharray="6 5" strokeLinecap="round" />
      {[-30, -10, 10, 30].map((px) => <Rect key={px} x={px - 2} y={Math.abs(px) * 0.5 - 12} width={4} height={14} rx={2} fill={M.trunk} />)}
    </G>;
    case 2: return <G opacity={o} transform={`translate(${x} ${y})`}>
      <Ellipse cx={0} cy={26} rx={44} ry={9} fill={M.grassDeep} />
      <Rect x={-30} y={-10} width={60} height={36} rx={3} fill={M.stone} />
      <Rect x={-38} y={-26} width={16} height={52} rx={3} fill={M.stone} /><Rect x={22} y={-26} width={16} height={52} rx={3} fill={M.stone} />
      <Path d="M-40 -26 L-30 -42 L-20 -26Z M20 -26 L30 -42 L40 -26Z" fill={C.primary} />
      <Path d="M-8 26 L-8 8 Q0 -2 8 8 L8 26Z" fill={M.trunk} />
      <Path d="M30 -42 L30 -54 L40 -50 L30 -46" fill={C.coral} stroke={M.stoneDark} strokeWidth={1} />
    </G>;
    case 3: return <G opacity={o}><Tree x={x - 22} y={y + 14} s={1.1} /><Tree x={x + 18} y={y + 8} s={0.9} /><Tree x={x} y={y + 24} s={1.25} /><Bush x={x + 36} y={y + 26} s={0.7} /></G>;
    case 4: return <G opacity={o} transform={`translate(${x} ${y})`}>
      <Path d="M-50 26 L-12 -38 L6 -12 L22 -30 L54 26Z" fill={M.stoneDark} />
      <Path d="M-12 -38 L-2 -22 L-10 -18 L-20 -24Z M22 -30 L30 -16 L18 -14Z" fill={C.paper} />
      <Path d="M-12 -38 L10 26 L-50 26Z" fill={M.stone} opacity={0.6} />
    </G>;
    default: return <G opacity={o} transform={`translate(${x} ${y})`}>
      {[C.coral, C.butter, M.leaf, M.water, C.lilac].map((col, i) => <Path key={i} d={`M${-40 + i * 5} 22 A${40 - i * 5} ${40 - i * 5} 0 0 1 ${40 - i * 5} 22`} stroke={col} strokeWidth={5} fill="none" />)}
      <Ellipse cx={-38} cy={22} rx={10} ry={5} fill={C.paper} /><Ellipse cx={38} cy={22} rx={10} ry={5} fill={C.paper} />
    </G>;
  }
}

export const TreasureArt = memo(function TreasureArt({ open }: { open: boolean }) {
  return <Svg width={78} height={70} viewBox="-39 -40 78 70">
    <Ellipse cx={0} cy={24} rx={32} ry={6} fill={M.grassDeep} />
    {open && <G><Circle cx={0} cy={-20} r={16} fill={C.butter} opacity={0.8} /><Path d="M0 -34 L4 -24 L14 -22 L6 -16 L8 -6 L0 -11 L-8 -6 L-6 -16 L-14 -22 L-4 -24Z" fill={C.paper} /></G>}
    <Rect x={-26} y={-2} width={52} height={26} rx={5} fill={C.coral} />
    <Path d={open ? 'M-26 -4 L-22 -22 L22 -22 L26 -4Z' : 'M-26 -2 Q0 -24 26 -2Z'} fill={M.roof} stroke={C.butter} strokeWidth={3} />
    <Rect x={-26} y={6} width={52} height={4} fill={C.butter} />
    <Rect x={-5} y={2} width={10} height={13} rx={3} fill={C.butter} />
  </Svg>;
});

/** Static world backdrop: meadow, river, lakes, trees, winding cream path. Memoised — never re-renders during travel. */
export const WorldBackdrop = memo(function WorldBackdrop({ width, height, pts, index }: { width: number; height: number; pts: Pt[]; index: number }) {
  const d = fullD(pts);
  const done = index > 0 ? fullD(pts.slice(0, index + 1)) : '';
  const deco: React.ReactNode[] = [];
  pts.forEach((p, i) => {
    const side = p.x < width / 2 ? 1 : -1;
    const lx = p.x + side * Math.min(110, width * 0.3);
    if (i < pts.length - 1) deco.push(<Landmark key={`l${i}`} kind={i} x={Math.max(48, Math.min(width - 48, lx))} y={p.y + 8} dim={i > index} />);
    deco.push(<Bush key={`b${i}`} x={p.x - side * 58} y={p.y + 62} s={0.8} />);
    deco.push(<Flowers key={`f${i}`} x={width / 2 + side * 18} y={p.y + 86} />);
    if (i % 2) deco.push(<Tree key={`t${i}`} x={side > 0 ? width - 22 : 22} y={p.y + 96} s={0.9} />);
  });
  const rY = Math.min(height - 60, TOP_PAD + STOP_GAP * 1.55);
  return <Svg width={width} height={height} style={{ position: 'absolute', left: 0, top: 0 }}>
    <Defs><LinearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor={M.grassLight} /><Stop offset="1" stopColor={M.grass} /></LinearGradient></Defs>
    <Rect x={0} y={0} width={width} height={height} fill="url(#sky)" />
    <Path d={`M-10 ${rY} C${width * 0.3} ${rY - 50} ${width * 0.6} ${rY + 60} ${width + 10} ${rY + 10} L${width + 10} ${rY + 46} C${width * 0.6} ${rY + 96} ${width * 0.3} ${rY - 14} -10 ${rY + 36}Z`} fill={M.water} />
    <Path d={`M${width * 0.2} ${rY + 4} q14 -6 28 0 M${width * 0.62} ${rY + 40} q14 -6 28 0`} stroke={M.foam} strokeWidth={2.5} fill="none" strokeLinecap="round" />
    {height > 700 && <G><Ellipse cx={width - 20} cy={height - 230} rx={70} ry={46} fill={M.water} /><Ellipse cx={width - 30} cy={height - 234} rx={40} ry={20} fill={M.waterDeep} opacity={0.35} /></G>}
    <Ellipse cx={10} cy={40} rx={60} ry={34} fill={M.grassDeep} opacity={0.5} />
    <Path d={d} stroke={M.pathEdge} strokeWidth={38} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    <Path d={d} stroke={M.path} strokeWidth={30} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    <Path d={d} stroke={M.dash} strokeWidth={3} strokeDasharray="10 12" fill="none" strokeLinecap="round" />
    {!!done && <Path d={done} stroke={C.butter} strokeWidth={8} fill="none" strokeLinecap="round" opacity={0.9} />}
    {deco}
  </Svg>;
});

export const Cloud = memo(function Cloud({ w = 90 }: { w?: number }) {
  return <Svg width={w} height={w * 0.45} viewBox="0 0 100 45"><Ellipse cx={50} cy={30} rx={46} ry={14} fill={C.paper} opacity={0.85} /><Circle cx={36} cy={22} r={15} fill={C.paper} opacity={0.85} /><Circle cx={60} cy={18} r={18} fill={C.paper} opacity={0.85} /></Svg>;
});
