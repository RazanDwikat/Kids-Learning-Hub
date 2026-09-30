import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Image, LayoutChangeEvent, Platform, useWindowDimensions, Pressable, ScrollView, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { C, T } from './ui';
import { Cloud, M, TreasureArt, WorldBackdrop, layout, sampleRoute } from './mapWorld';
import { useForeground, useInViewport, useReducedMotion } from './useAmbientActive';

const VIEW_H = 480;
const BUNNY = 64;
const NAMES = ['Sunny cottage', 'Little bridge', 'Bunny’s castle', 'Whispering woods', 'Counting mountain', 'Rainbow gate'];
const ND = Platform.OS !== 'web';

type Props = { index: number; total: number; blocked: boolean; onOpen: () => void; transitionFrom?: number; onArrive?: () => void };

export function AdventureMap({ index, total, blocked, onOpen, transitionFrom, onArrive }: Props) {
  const [measured, setMeasured] = useState(0);
  const win = useWindowDimensions();
  const width = measured || Math.max(280, Math.min(win.width - 40, 560));
  const box = useRef<View>(null);
  const inView = useInViewport(box);
  const reduced = useReducedMotion();
  const foreground = useForeground();
  const live = foreground && inView;
  const scroll = useRef<ScrollView>(null);
  const dest = Math.max(0, Math.min(index, total));
  const from = transitionFrom === undefined ? undefined : Math.max(0, Math.min(transitionFrom, dest));
  const traveling = from !== undefined && from < dest;
  const [arrived, setArrived] = useState(!traveling);
  const arriveRef = useRef(onArrive); arriveRef.current = onArrive;
  const firedFor = useRef<string | null>(null);

  const { pts, height } = useMemo(() => layout(width || 320, total + 1), [width, total]);
  const t = useRef(new Animated.Value(0)).current;
  const hop = useRef(new Animated.Value(0)).current;
  const celebrate = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(1)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const cloudX = useRef(new Animated.Value(0)).current;

  const route = useMemo(() => (traveling ? sampleRoute(pts, from!, dest) : [pts[dest]]), [pts, traveling, from, dest]);
  const input = route.map((_, i) => (route.length > 1 ? i / (route.length - 1) : 0));
  const range = route.length > 1 ? input : [0, 1];
  const xs = route.length > 1 ? route.map((p) => p.x - BUNNY / 2) : [route[0].x - BUNNY / 2, route[0].x - BUNNY / 2];
  const ys = route.length > 1 ? route.map((p) => p.y - BUNNY - 10) : [route[0].y - BUNNY - 10, route[0].y - BUNNY - 10];
  const scrollFor = (y: number) => Math.max(0, Math.min(height - VIEW_H, y - VIEW_H * 0.55));

  // Travel sequence — keyed by transition identity so it plays once.
  useEffect(() => {
    if (!width) return;
    const key = `${from}->${dest}`;
    const finish = () => {
      setArrived(true);
      if (traveling && firedFor.current !== key) { firedFor.current = key; arriveRef.current?.(); }
    };
    if (!traveling) { setArrived(true); requestAnimationFrame(() => scroll.current?.scrollTo({ y: scrollFor(pts[dest].y), animated: false })); return; }
    if (firedFor.current === key) { setArrived(true); return; }
    setArrived(false);
    if (!live) return; // defer until seen; restarts cleanly on resume
    if (reduced) {
      fade.setValue(0); t.setValue(1);
      scroll.current?.scrollTo({ y: scrollFor(pts[dest].y), animated: false });
      const a = Animated.timing(fade, { toValue: 1, duration: 260, useNativeDriver: false });
      a.start(({ finished }) => { if (finished) finish(); }); return () => a.stop();
    }
    t.setValue(0); celebrate.setValue(0);
    scroll.current?.scrollTo({ y: scrollFor(pts[from!].y), animated: false });
    const id = t.addListener(({ value }) => {
      const p = route[Math.min(route.length - 1, Math.round(value * (route.length - 1)))];
      scroll.current?.scrollTo({ y: scrollFor(p.y), animated: false });
    });
    const segs = dest - from!;
    const dur = Math.min(2600, 1100 * segs);
    const hops = Math.max(3, Math.round(dur / 300));
    const seq = Animated.sequence([
      Animated.timing(celebrate, { toValue: 1, duration: 650, easing: Easing.out(Easing.back(2)), useNativeDriver: false }),
      Animated.parallel([
        Animated.timing(t, { toValue: 1, duration: dur, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
        Animated.loop(Animated.sequence([
          Animated.timing(hop, { toValue: 1, duration: dur / hops / 2, easing: Easing.out(Easing.quad), useNativeDriver: false }),
          Animated.timing(hop, { toValue: 0, duration: dur / hops / 2, easing: Easing.in(Easing.quad), useNativeDriver: false }),
        ]), { iterations: hops }),
      ]),
    ]);
    seq.start(({ finished }) => { if (finished) finish(); });
    return () => { seq.stop(); t.removeListener(id); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, from, dest, traveling, reduced, live]);

  // Ambient loops: paused when backgrounded/hidden, reduced motion, or unmounted.
  useEffect(() => {
    if (!live || reduced) return;
    const a = Animated.loop(Animated.timing(cloudX, { toValue: 1, duration: 38000, easing: Easing.linear, useNativeDriver: ND }));
    const b = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 1100, easing: Easing.inOut(Easing.sin), useNativeDriver: ND }),
      Animated.timing(pulse, { toValue: 0, duration: 1100, easing: Easing.inOut(Easing.sin), useNativeDriver: ND }),
    ]));
    a.start(); b.start();
    return () => { a.stop(); b.stop(); };
  }, [live, reduced, cloudX, pulse]);

  const onLayout = (e: LayoutChangeEvent) => { const w = Math.round(e.nativeEvent.layout.width); if (w && Math.abs(w - measured) > 1) setMeasured(w); };
  const shownIndex = arrived ? dest : from ?? dest;
  const inputBlocked = blocked || !arrived;
  const bunnyX = t.interpolate({ inputRange: range, outputRange: xs, extrapolate: 'clamp' });
  const bunnyY = Animated.add(t.interpolate({ inputRange: range, outputRange: ys, extrapolate: 'clamp' }), hop.interpolate({ inputRange: [0, 1], outputRange: [0, -22] }));

  return <View ref={box} testID="adventure-map" onLayout={onLayout} accessibilityLabel={`Bunny’s trail, stop ${Math.min(dest + 1, total)} of ${total}`} style={{ height: VIEW_H, borderRadius: 30, overflow: 'hidden', marginVertical: 16, backgroundColor: M.grass, borderWidth: 3, borderColor: C.paper }}>
    {<ScrollView ref={scroll} style={{ height: VIEW_H - 6, flexGrow: 0, flexShrink: 1, minHeight: 0 }} scrollEnabled={arrived} nestedScrollEnabled showsVerticalScrollIndicator={false} contentContainerStyle={{ height }}>
      <WorldBackdrop width={width} height={height} pts={pts} index={dest} />
      {[0, 1, 2].map((i) => <Animated.View key={i} pointerEvents="none" style={{ position: 'absolute', top: 30 + i * Math.max(200, height / 3), left: -110, opacity: 0.9, transform: [{ translateX: cloudX.interpolate({ inputRange: [0, 1], outputRange: [((i * 0.37) % 1) * (width + 220), ((i * 0.37) % 1) * (width + 220) + width + 220] }) }] }}><Cloud w={80 + i * 16} /></Animated.View>)}
      {pts.slice(0, total).map((p, i) => {
        const done = i < dest, current = i === dest, justDone = traveling && i === from;
        const state = done ? 'finished' : current ? arrived ? 'current stop, tap to play' : 'opening, Bunny is arriving' : 'locked';
        return <View key={i} style={{ position: 'absolute', left: p.x - 36, top: p.y - 36, width: 72, alignItems: 'center' }}>
          {current && <Animated.View pointerEvents="none" style={{ position: 'absolute', top: -8, width: 88, height: 88, borderRadius: 44, backgroundColor: C.butter, opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.8] }), transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.12] }) }] }} />}
          <Animated.View style={justDone ? { transform: [{ scale: celebrate.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.25, 1] }) }] } : undefined}>
            <Pressable testID={`adventure-stop-${i + 1}`} accessibilityRole="button" accessibilityState={{ disabled: inputBlocked || !current }} accessibilityLabel={`${NAMES[i % 6]}, stop ${i + 1}, ${state}`} disabled={inputBlocked || !current} onPress={onOpen}
              style={({ pressed }) => ({ width: 72, height: 72, alignItems: 'center', justifyContent: 'flex-start', transform: [{ translateY: pressed ? 3 : 0 }] })}>
              <View style={{ position: 'absolute', top: 12, width: 64, height: 60, borderRadius: 32, backgroundColor: done ? C.primary : current ? M.pathEdge : M.stoneDark }} />
              <View style={{ width: 64, height: 60, borderRadius: 32, backgroundColor: done ? C.mint : current ? C.paper : M.stone, borderWidth: 3, borderColor: done ? C.primary : current ? C.butter : C.paper, alignItems: 'center', justifyContent: 'center' }}>
                {done ? <Feather name="check" size={28} color={C.primary} /> : current ? <T style={{ fontFamily: 'Fredoka SemiBold', fontSize: 24, lineHeight: 28, color: C.primary }}>{i + 1}</T> : <Feather name="lock" size={22} color={C.paper} />}
              </View>
            </Pressable>
          </Animated.View>
          {done && <View pointerEvents="none" style={{ position: 'absolute', top: -14, flexDirection: 'row', gap: 2 }}>{[0, 1, 2].map((k) => <Feather key={k} name="star" size={k === 1 ? 16 : 12} color={C.coral} style={{ marginTop: k === 1 ? 0 : 5 }} />)}</View>}
          {justDone && !reduced && <Animated.View pointerEvents="none" style={{ position: 'absolute', top: -20, width: 110, height: 110, opacity: celebrate.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 1, 0] }) }}>{Array.from({ length: 8 }, (_, k) => <Animated.View key={k} style={{ position: 'absolute', left: 47, top: 47, transform: [{ rotate: `${k * 45}deg` }, { translateY: celebrate.interpolate({ inputRange: [0, 1], outputRange: [0, -50] }) }] }}><Feather name="star" size={14} color={k % 2 ? C.coral : C.butter} /></Animated.View>)}</Animated.View>}
          <View style={{ marginTop: 4, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, backgroundColor: C.paper, opacity: i > shownIndex ? 0.8 : 1 }}><T numberOfLines={1} style={{ fontSize: 11, lineHeight: 15, fontFamily: 'DM Sans Bold', color: C.primary }}>{NAMES[i % 6]}</T></View>
        </View>;
      })}
      <View testID="adventure-treasure" accessibilityLabel={shownIndex >= total ? 'Treasure reached' : 'Treasure at the end of the trail'} style={{ position: 'absolute', left: pts[total].x - 39, top: pts[total].y - 50, alignItems: 'center' }}>
        <TreasureArt open={shownIndex >= total} />
        <View style={{ paddingHorizontal: 8, borderRadius: 10, backgroundColor: C.butter }}><T style={{ fontSize: 11, lineHeight: 16, fontFamily: 'DM Sans Bold', color: C.primary }}>Treasure</T></View>
      </View>
      <Animated.View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, opacity: fade, transform: [{ translateX: bunnyX }, { translateY: bunnyY }] }}>
        <Image accessibilityLabel="Bunny" source={require('../../assets/images/sprout-bunny.png')} style={{ width: BUNNY, height: BUNNY }} resizeMode="contain" />
      </Animated.View>
    </ScrollView>}
  </View>;
}

export function TreasureCelebration() {
  const burst = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.spring(burst, { toValue: 1, friction: 5, useNativeDriver: Platform.OS !== 'web' }).start(); }, [burst]);
  return <View testID="treasure-celebration" accessibilityLabel="Stars and confetti celebrate your treasure" style={{ height: 240, backgroundColor: C.butter, borderRadius: 30, justifyContent: 'center', alignItems: 'center', marginVertical: 20, overflow: 'hidden' }}>
    {Array.from({ length: 18 }, (_, i) => <Animated.View key={i} style={{ position: 'absolute', left: `${8 + (i * 17) % 84}%`, top: `${8 + (i * 23) % 80}%`, opacity: burst, transform: [{ translateY: burst.interpolate({ inputRange: [0, 1], outputRange: [-100, 0] }) }, { rotate: `${i * 31}deg` }] }}><Feather name={i % 3 ? 'star' : 'sun'} size={i % 3 ? 15 : 22} color={i % 2 ? C.coral : C.primary} /></Animated.View>)}
    <Animated.View testID="treasure-chest" style={{ transform: [{ scale: burst.interpolate({ inputRange: [0, 1], outputRange: [.4, 1] }) }], width: 150, height: 140, alignItems: 'center', justifyContent: 'flex-end' }}>
      <Feather name="star" size={48} color={C.coral} />
      <View style={{ width: 138, height: 68, borderRadius: 16, backgroundColor: C.primary, borderWidth: 5, borderColor: C.input, alignItems: 'center', justifyContent: 'center' }}><View style={{ width: 24, height: 30, borderRadius: 6, backgroundColor: C.butter, alignItems: 'center', justifyContent: 'center' }}><Feather name="heart" size={15} color={C.primary} /></View></View>
      <Animated.View style={{ position: 'absolute', width: 144, height: 42, top: 40, borderTopLeftRadius: 30, borderTopRightRadius: 30, borderWidth: 5, borderColor: C.input, backgroundColor: C.primary, transform: [{ translateY: burst.interpolate({ inputRange: [0, 1], outputRange: [24, -26] }) }, { rotate: burst.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-12deg'] }) }] }} />
    </Animated.View>
  </View>;
}
