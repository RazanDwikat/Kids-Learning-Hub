import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import colors from '@/constants/colors';

export const C = colors.light;
export const styles = StyleSheet.create({
  text: { fontFamily: 'DM Sans', fontSize: 15, lineHeight: 23, color: C.foreground },
  title: { fontFamily: 'Fredoka SemiBold', fontSize: 34, lineHeight: 38, color: C.foreground, marginTop: 18, marginBottom: 10 },
  heading: { fontFamily: 'Fredoka SemiBold', fontSize: 23, lineHeight: 28, color: C.foreground, marginTop: 24, marginBottom: 12 },
  eyebrow: { fontFamily: 'DM Sans Bold', fontSize: 10, letterSpacing: 1.5, color: C.primary },
  muted: { color: C.mutedForeground, fontSize: 13, lineHeight: 20 },
  card: { padding: 20, borderRadius: 24, backgroundColor: C.paper, borderWidth: 1, borderColor: C.border, marginVertical: 8, gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  button: { minHeight: 55, paddingHorizontal: 17, paddingVertical: 13, backgroundColor: C.primary, borderRadius: 19, alignItems: 'center', justifyContent: 'center', marginVertical: 6 },
  buttonText: { fontFamily: 'DM Sans Bold', color: C.paper, fontSize: 15 },
  metric: { flex: 1, minWidth: 85, borderRadius: 21, padding: 14, backgroundColor: C.muted, alignItems: 'center' },
  number: { fontFamily: 'Fredoka SemiBold', fontSize: 27, lineHeight: 34, color: C.primary },
  art: { backgroundColor: C.muted, height: 225, borderRadius: 30, marginVertical: 18, alignItems: 'center', justifyContent: 'center' },
  bunny: { width: 220, height: 220 },
  choice: { minWidth: 66, minHeight: 64, padding: 14, borderRadius: 18, backgroundColor: C.paper, borderWidth: 2, borderColor: C.input, alignItems: 'center', justifyContent: 'center' },
  selected: { backgroundColor: C.mint, borderColor: C.primary },
  track: { backgroundColor: C.border, height: 8, borderRadius: 8, overflow: 'hidden', marginVertical: 16 },
  fill: { height: 8, borderRadius: 8, backgroundColor: C.primary },
});
export function T({ style, ...props }: React.ComponentProps<typeof Text>) { return <Text {...props} style={[styles.text, style]} />; }
export function Action({ title, onPress, disabled, secondary, testID }: { title: string; onPress: () => void; disabled?: boolean; secondary?: boolean; testID?: string }) {
  return <Pressable accessibilityRole="button" testID={testID ?? `button-${title.toLowerCase().replace(/\s+/g, '-')}`} disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.button, secondary && { backgroundColor: C.paper, borderWidth: 1, borderColor: C.input }, { opacity: disabled ? .45 : pressed ? .8 : 1 }, pressed && { transform: [{ translateY: 3 }] }]}><T style={[styles.buttonText, secondary && { color: C.primary }]}>{title}</T></Pressable>;
}
export function Card({ children, tint }: { children: React.ReactNode; tint?: string }) { return <View style={[styles.card, tint ? { backgroundColor: tint } : null]}>{children}</View>; }
export function Heading({ children }: { children: React.ReactNode }) { return <T style={styles.heading}>{children}</T>; }
export function Metric({ value, label }: { value: string | number; label: string }) { return <View style={styles.metric}><T style={styles.number}>{value}</T><T style={[styles.muted, { textAlign: 'center', fontSize: 11 }]}>{label}</T></View>; }
export function Bunny() { return <View style={styles.art}><Image accessibilityLabel="Bunny, your learning companion" source={require('../../assets/images/sprout-bunny.png')} style={styles.bunny} resizeMode="contain" /></View>; }
export function Progress({ value, total }: { value: number; total: number }) { return <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: total, now: value }} style={styles.track}><View style={[styles.fill, { width: `${total ? Math.min(100, value / total * 100) : 0}%` }]} /></View>; }
export function Loading() { return <View accessibilityLabel="Loading your garden" style={{ gap: 16, marginTop: 28 }}>{[160, 80, 110].map((height, i) => <View key={i} style={{ height, backgroundColor: C.muted, borderRadius: 24, opacity: 1 - i * .2 }} />)}<T style={styles.muted}>Opening your garden…</T></View>; }
export function Failure({ retry, busy = false, message = 'Your garden could not load. Please try again.' }: { retry: () => void; busy?: boolean; message?: string }) { return <Card><Feather name="cloud-off" size={28} color={C.primary} /><T>{message}</T><Action title={busy ? 'Retrying…' : 'Retry'} onPress={retry} disabled={busy} /></Card>; }