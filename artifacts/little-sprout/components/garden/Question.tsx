import React, { useRef, useState } from 'react';
import { Animated, PanResponder, Platform, Pressable, TextInput, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { ActivityAnswer, ActivityQuestion } from '@workspace/api-client-react';
import { C, T, styles as s } from './ui';

type Bounds = { x: number; y: number; width: number; height: number };
type TileProps = { value: string; target: React.RefObject<View | null>; onSelect: (value: string) => void; disabled: boolean };
function WebNumberTile({ value, target, onSelect, disabled }: TileProps) {
  const drag = useRef<{ x: number; y: number; bounds: Bounds | null } | null>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const reset = () => { drag.current = null; setOffset({ x: 0, y: 0 }); };
  return <div data-testid={`drag-${value}`} style={{ minWidth: 66, minHeight: 64, padding: 14, boxSizing: 'border-box', borderRadius: 18, background: C.paper, border: `2px solid ${C.input}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Fredoka SemiBold', fontSize: 27, color: C.primary, touchAction: 'none', userSelect: 'none', cursor: disabled ? 'default' : 'grab', position: 'relative', zIndex: 5, transform: `translate(${offset.x}px, ${offset.y}px)` }}
    onPointerDown={e => {
      if (disabled || e.button !== 0) return;
      e.preventDefault();
      const gesture = { x: e.clientX, y: e.clientY, bounds: null as Bounds | null };
      drag.current = gesture;
      e.currentTarget.setPointerCapture(e.pointerId);
      target.current?.measureInWindow((x, y, width, height) => { gesture.bounds = { x, y, width, height }; });
    }}
    onPointerMove={e => { if (drag.current) { e.preventDefault(); setOffset({ x: e.clientX - drag.current.x, y: e.clientY - drag.current.y }); } }}
    onPointerUp={e => {
      const b = drag.current?.bounds;
      if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
      reset();
      if (!disabled && b && e.clientX >= b.x && e.clientX <= b.x + b.width && e.clientY >= b.y && e.clientY <= b.y + b.height) onSelect(value);
    }}
    onPointerCancel={reset}
    onLostPointerCapture={reset}
  >{value}</div>;
}
function NumberTile({ value, target, onSelect, disabled }: { value: string; target: React.RefObject<View | null>; onSelect: (value: string) => void; disabled: boolean }) {
  const offset = useRef(new Animated.ValueXY()).current;
  const props = useRef({ target, onSelect, disabled });
  props.current = { target, onSelect, disabled };
  const bounds = useRef<Bounds | null>(null);
  const responder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => !props.current.disabled,
    onMoveShouldSetPanResponder: () => !props.current.disabled,
    onPanResponderGrant: () => props.current.target.current?.measureInWindow((x, y, width, height) => { bounds.current = { x, y, width, height }; }),
    onPanResponderMove: (_, g) => offset.setValue({ x: g.dx, y: g.dy }),
    onPanResponderRelease: (_, g) => {
      const b = bounds.current;
      if (!props.current.disabled && b && g.moveX >= b.x && g.moveX <= b.x + b.width && g.moveY >= b.y && g.moveY <= b.y + b.height) props.current.onSelect(value);
      Animated.spring(offset, { toValue: { x: 0, y: 0 }, useNativeDriver: Platform.OS !== 'web' }).start();
    },
    onPanResponderTerminate: () => offset.setValue({ x: 0, y: 0 }),
  })).current;
  if (Platform.OS === 'web') return <WebNumberTile value={value} target={target} onSelect={onSelect} disabled={disabled} />;
  return <Animated.View testID={`drag-${value}`} {...responder.panHandlers} style={[s.choice, { transform: offset.getTranslateTransform(), zIndex: 5 }]}><T selectable={false} style={s.number}>{value}</T></Animated.View>;
}

export function Question({ question: q, answer, onChange, disabled }: { question: ActivityQuestion; answer: ActivityAnswer; onChange: (a: ActivityAnswer) => void; disabled: boolean }) {
  const target = useRef<View>(null);
  const [left, setLeft] = useState<string | null>(null);
  const [counted, setCounted] = useState<number[]>([]);
  const tokenCount = q.tokens.length || (q.prompt.match(/\p{Extended_Pictographic}/gu) ?? []).length;
  const selectedItems = answer.items ?? [];
  const remainingTokens = q.tokens.map((value, index) => ({ value, index })).filter(({ value, index }) => q.tokens.slice(0, index + 1).filter(v => v === value).length > selectedItems.filter(v => v === value).length).reverse();
  const append = (value: string) => { if (selectedItems.length < q.tokens.length) onChange({ items: [...selectedItems, value] }); };
  const choose = (value: string) => onChange({ value });
  return <View style={{ gap: 18 }}>
    <T style={s.eyebrow}>{({ choice: 'CHOOSE AN ANSWER', drag: 'MOVE A NUMBER', matching: 'MAKE A MATCH', counting: 'COUNT THE APPLES', direct: 'WRITE THE ANSWER', ordering: 'PUT THE NUMBERS IN ORDER' })[q.type]}</T>
    <T style={s.title}>{q.prompt.replace(/\p{Extended_Pictographic}/gu, '').replace(/:\s*\+\s*$/, '')}</T>
    {q.type === 'counting' && <><View style={[s.row, { justifyContent: 'center', paddingVertical: 20 }]}>{Array.from({ length: tokenCount }, (_, i) => <Pressable key={i} testID={`count-object-${i}`} disabled={disabled} accessibilityLabel={`Apple ${i + 1}${counted.includes(i) ? ', counted' : ''}`} onPress={() => setCounted(old => old.includes(i) ? old.filter(n => n !== i) : [...old, i])} style={{ padding: 5, opacity: counted.includes(i) ? .45 : 1 }}><MaterialCommunityIcons name="food-apple" size={37} color={C.coral} /><T style={{ textAlign: 'center', fontSize: 10 }}>{counted.includes(i) ? counted.indexOf(i) + 1 : ' '}</T></Pressable>)}</View><T style={s.muted}>Touch each apple to count it, then enter your answer.</T></>}
    {(q.type === 'drag' || q.type === 'ordering') && <><View ref={target} collapsable={false} testID="answer-drop-target" style={[s.choice, { minHeight: 100, borderStyle: 'dashed', backgroundColor: C.muted }]}><T style={s.number}>{selectedItems.join(' · ') || '?'}</T><T style={s.muted}>{q.type === 'ordering' ? 'Build your order from left to right' : 'Drop each piece here in order'}</T></View><View style={[s.row, { justifyContent: 'center' }]}>{remainingTokens.map(({ value, index }) => <NumberTile key={index} value={value} target={target} onSelect={append} disabled={disabled} />)}</View><T style={s.muted}>Or tap a piece below instead of dragging.</T><View style={s.row}>{remainingTokens.map(({ value, index }) => <Pressable testID={`tap-token-${index}`} key={index} accessibilityRole="button" disabled={disabled} onPress={() => append(value)} style={s.choice}><T style={s.number}>{value}</T></Pressable>)}</View><Pressable testID="undo-token" disabled={disabled || !selectedItems.length} onPress={() => onChange({ items: selectedItems.slice(0, -1) })}><T style={{ color: C.primary, textDecorationLine: 'underline' }}>Undo last piece</T></Pressable></>}
    {['choice', 'counting'].includes(q.type) && <View style={[s.row, { justifyContent: 'center' }]}>{q.options.map(v => <Pressable testID={`answer-${v}`} accessibilityRole="button" accessibilityState={{ selected: answer.value === v, disabled }} disabled={disabled} key={v} onPress={() => choose(v)} style={[s.choice, answer.value === v && s.selected]}><T style={s.number}>{v}</T></Pressable>)}</View>}
    {(q.type === 'direct' || q.type === 'counting' && !q.options.length) && <TextInput testID="direct-answer" accessibilityLabel="Your answer" editable={!disabled} keyboardType={q.concept.toLowerCase().includes('shape') ? 'default' : 'number-pad'} autoCapitalize="none" value={answer.value ?? ''} onChangeText={v => choose(q.concept.toLowerCase().includes('shape') ? v.slice(0, 30) : v.replace(/[^0-9]/g, '').slice(0, 3))} placeholder="?" placeholderTextColor={C.mutedForeground} style={[s.choice, s.number, { textAlign: 'center' }]} />}
    {q.type === 'matching' && <><T style={s.muted}>Tap a sum on the left, then its answer on the right. Tap a sum again to change its match.</T><View style={{ flexDirection: 'row', gap: 16 }}>{[q.left, q.right].map((items, column) => <View key={column} style={{ flex: 1, gap: 10 }}>{items.map(v => {
      const pair = answer.pairs?.find(p => column === 0 ? p.left === v : p.right === v);
      return <Pressable testID={`match-${column}-${v}`} accessibilityRole="button" disabled={disabled || (column === 1 && !left)} key={v} style={[s.choice, (pair || left === v) && s.selected]} onPress={() => {
        if (column === 0) setLeft(v);
        else if (left) { onChange({ pairs: [...(answer.pairs ?? []).filter(p => p.left !== left && p.right !== v), { left, right: v }] }); setLeft(null); }
      }}><T style={{ fontFamily: 'Fredoka SemiBold', fontSize: 22 }}>{v}</T>{pair && <T style={[s.muted, { fontSize: 10 }]}>{column === 0 ? `Matched to ${pair.right}` : `Matched to ${pair.left}`}</T>}</Pressable>;
    })}</View>)}</View></>}
  </View>;
}