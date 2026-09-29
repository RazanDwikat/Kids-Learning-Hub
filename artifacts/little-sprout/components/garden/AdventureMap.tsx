import React, { useEffect, useRef } from 'react';
import { Animated, Image, Platform, Pressable, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { C, T, styles as s } from './ui';

export function AdventureMap({ index, total, blocked, onOpen, animateAdvance = blocked }: { index: number; total: number; blocked: boolean; onOpen: () => void; animateAdvance?: boolean }) {
  const previous = animateAdvance ? Math.max(0, index - 1) : index;
  const position = useRef(new Animated.Value(previous * 96)).current;
  const sway = useRef(new Animated.Value(previous % 2 ? 56 : 0)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(position, { toValue: index * 96, duration: 900, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(sway, { toValue: index % 2 ? 56 : 0, duration: 900, useNativeDriver: Platform.OS !== 'web' }),
    ]).start();
  }, [index, position, sway]);
  const names = ['Sunny meadow', 'Little bridge', 'Bunny’s castle', 'Whispering woods', 'Counting mountain', 'Rainbow gate'];
  return <View testID="adventure-map" style={{ backgroundColor: C.muted, borderRadius: 30, padding: 20, marginVertical: 16 }}>
    <View style={s.row}><Feather name="home" size={24} color={C.primary} /><T>Start · Bunny’s garden</T></View>
    <View style={{ marginTop: 16, paddingLeft: 66 }}>
      <View style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, borderLeftWidth: 3, borderStyle: 'dashed', borderColor: C.input }} />
      {Array.from({ length: total }, (_, i) => <View key={i} style={{ height: 96, alignItems: i % 2 ? 'flex-end' : 'flex-start' }}><Pressable testID={`adventure-stop-${i + 1}`} accessibilityRole="button" accessibilityLabel={`${names[i % 6]}, ${i < index ? 'finished' : i === index ? 'current stop' : 'locked'}`} disabled={blocked || i !== index} onPress={onOpen} style={[s.choice, { width: 142, minHeight: 78 }, i <= index && s.selected]}><Feather name={i < index ? 'check-circle' : i === index ? 'map-pin' : 'lock'} size={24} color={C.primary} /><T style={{ fontSize: 12 }}>{i + 1}. {names[i % 6]}</T></Pressable></View>)}
      <View style={{ height: 72, alignItems: 'center' }}><Feather name="gift" size={34} color={C.primary} /><T>Treasure</T></View>
      <Animated.View pointerEvents="none" style={{ position: 'absolute', left: -66, top: 2, transform: [{ translateY: position }, { translateX: sway }] }}><Image source={require('../../assets/images/sprout-bunny.png')} style={{ width: 70, height: 70 }} resizeMode="contain" /></Animated.View>
    </View>
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