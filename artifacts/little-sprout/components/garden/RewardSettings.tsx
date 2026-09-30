import React, { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Switch, TextInput, View, useWindowDimensions } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import { getListRewardOptionsQueryKey, useListRewardOptions, useCreateRewardOption, useUpdateRewardOption, useDeleteRewardOption } from '@workspace/api-client-react';
import type { RewardOption, RewardOptionInput } from '@workspace/api-client-react';
import { C, Failure, T, styles as s } from './ui';

type Category = RewardOptionInput['category'];
const CATEGORIES: NonNullable<Category>[] = ['activity', 'screen_time', 'snack', 'other'];
const CATEGORY_LABEL: Record<string, string> = { activity: 'Play together', screen_time: 'Screen time', snack: 'Snack', other: 'Your own idea' };
const CATEGORY_ICON: Record<string, 'sun' | 'monitor' | 'coffee' | 'gift'> = { activity: 'sun', screen_time: 'monitor', snack: 'coffee', other: 'gift' };

const blank: RewardOptionInput = { enabled: true, category: 'activity', title: '', message: '' };
const inputFrom = (option: RewardOption): RewardOptionInput => ({
  enabled: option.enabled, category: option.category, title: option.title, message: option.message,
});
const same = (a: RewardOptionInput, b: RewardOptionInput) =>
  a.enabled === b.enabled && a.category === b.category && a.title === b.title && a.message === b.message;

type Notice = { tone: 'ok' | 'error'; text: string } | null;
type View_ = { mode: 'list' } | { mode: 'form'; id?: string; initial: RewardOptionInput };

export function RewardSettings() {
  const query = useListRewardOptions();
  const [open, setOpen] = useState(false);
  const opener = useRef<View>(null);
  const wasOpen = useRef(false);
  useEffect(() => {
    const restore = wasOpen.current && !open;
    wasOpen.current = open;
    if (!restore || Platform.OS !== 'web') return;
    // Wait for the Modal's focus trap and portal to finish their cleanup.
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => {
        (opener.current as unknown as HTMLElement | null)?.focus();
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [open]);
  const [view, setView] = useState<View_>({ mode: 'list' });
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const [noticeId, setNoticeId] = useState<string | null>(null);
  const busy = useRef(false);
  const cache = useQueryClient();
  const create = useCreateRewardOption();
  const update = useUpdateRewardOption();
  const remove = useDeleteRewardOption();
  const key = getListRewardOptionsQueryKey();
  const options = query.data ?? [];
  const selected = options.filter(option => option.enabled);

  // All writes are serialized. A toggle must never submit an old title/message
  // over an edit or another toggle while their requests are in flight.
  const save = async (data: RewardOptionInput, id?: string): Promise<boolean> => {
    if (busy.current) return false;
    busy.current = true;
    setBusyId(id ?? 'new');
    setNotice(null);
    setNoticeId(id ?? null);
    try {
      await cache.cancelQueries({ queryKey: key });
      const saved = id ? await update.mutateAsync({ rewardId: id, data }) : await create.mutateAsync({ data });
      await cache.cancelQueries({ queryKey: key });
      cache.setQueryData<RewardOption[]>(key, old => id
        ? old?.map(option => option.id === id ? saved : option)
        : old ? [...old, saved] : [saved]);
      setNoticeId(saved.id);
      setNotice({ tone: 'ok', text: id ? 'Saved for future adventures.' : 'Reward added to your pool.' });
      return true;
    } catch {
      setNotice({ tone: 'error', text: 'Could not confirm the save. Refreshing your saved choices; check before retrying.' });
      void cache.invalidateQueries({ queryKey: key });
      return false;
    } finally {
      busy.current = false;
      setBusyId(null);
    }
  };

  const deleteOption = async (id: string) => {
    if (busy.current) return;
    busy.current = true;
    setBusyId(id);
    setNotice(null);
    setNoticeId(id);
    try {
      await cache.cancelQueries({ queryKey: key });
      await remove.mutateAsync({ rewardId: id });
      await cache.cancelQueries({ queryKey: key });
      cache.setQueryData<RewardOption[]>(key, old => old?.filter(option => option.id !== id));
      setConfirmDeleteId(null);
      setNoticeId(null);
      setNotice({ tone: 'ok', text: 'Reward removed. Previously earned rewards stay the same.' });
    } catch {
      setNotice({ tone: 'error', text: 'Could not confirm removal. Refreshing your saved choices; check before retrying.' });
      void cache.invalidateQueries({ queryKey: key });
    } finally {
      busy.current = false;
      setBusyId(null);
    }
  };

  const openManager = (startAdding = false) => {
    setNotice(null); setNoticeId(null); setConfirmDeleteId(null);
    setView(startAdding ? { mode: 'form', initial: blank } : { mode: 'list' });
    setOpen(true);
  };

  const preview = selected.slice(0, 3).map(o => o.title).join(' · ') + (selected.length > 3 ? ` +${selected.length - 3} more` : '');

  return <View style={r.summary} testID="reward-summary">
    <View style={[s.row, { flexWrap: 'nowrap', alignItems: 'flex-start' }]}>
      <View style={r.badge}><Feather name="gift" size={20} color={C.primary} /></View>
      <View style={{ flex: 1, gap: 2 }}>
        <T style={s.eyebrow}>REWARD POOL</T>
        {query.isPending ? <View style={r.skeleton} /> : query.isError && !query.data ? null : <>
          <T style={r.summaryTitle} testID="reward-selected-count">{selected.length} of {options.length} selected</T>
          {!!preview && <T style={r.preview} numberOfLines={1}>{preview}</T>}
        </>}
      </View>
    </View>
    {query.isError && !query.data
      ? <Failure retry={() => void query.refetch()} busy={query.isFetching} message="Could not load the reward pool. Please retry." />
      : <>
        <T style={s.muted}>{options.length === 0
          ? 'Finishing Homework or an Exam can award one little celebration you choose.'
          : selected.length === 0 ? 'Nothing selected, so no configured reward will be awarded yet.'
            : 'One selected reward is drawn at random after each Homework or Exam.'}</T>
        {!query.isPending && <Pressable ref={opener} testID={options.length ? 'manage-rewards' : 'add-first-reward'} accessibilityRole="button"
          accessibilityLabel={options.length ? 'Manage rewards' : 'Add your first reward'}
          onPress={() => openManager(options.length === 0)} style={({ pressed }) => [r.summaryBtn, pressed && { opacity: .8 }]}>
          <Feather name={options.length ? 'sliders' : 'plus'} size={16} color={C.paper} />
          <T style={r.summaryBtnText}>{options.length ? 'Manage rewards' : 'Add your first reward'}</T>
        </Pressable>}
      </>}
    {open && <RewardManager
      options={options} view={view} setView={setView} busyId={busyId} notice={notice} noticeId={noticeId}
      confirmDeleteId={confirmDeleteId} setConfirmDeleteId={id => { setConfirmDeleteId(id); setNotice(null); }}
      refreshError={query.isError}
      onToggle={(option, enabled) => void save({ ...inputFrom(option), enabled }, option.id)}
      onDelete={id => void deleteOption(id)}
      onSave={save}
      clearNotice={() => setNotice(null)}
      onClose={() => { if (!busy.current) { setOpen(false); setConfirmDeleteId(null); } }}
    />}
  </View>;
}

function RewardManager(p: {
  options: RewardOption[]; view: View_; setView: (v: View_) => void; busyId: string | null;
  notice: Notice; noticeId: string | null; confirmDeleteId: string | null; setConfirmDeleteId: (id: string | null) => void;
  refreshError: boolean; onToggle: (o: RewardOption, enabled: boolean) => void; onDelete: (id: string) => void;
  onSave: (data: RewardOptionInput, id?: string) => Promise<boolean>; clearNotice: () => void; onClose: () => void;
}) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const wide = width >= 720;
  const webTop = Platform.OS === 'web' && !wide ? 24 : 0;
  const sheetHeight = wide ? Math.min(680, height - 64) : height - Math.max(insets.top, 12) - webTop - 8;
  const [dirty, setDirty] = useState(false);
  const [warn, setWarn] = useState(false);
  const pendingLeave = useRef<(() => void) | null>(null);
  const selectedCount = p.options.filter(o => o.enabled).length;
  const inForm = p.view.mode === 'form';

  const requestLeaveForm = (then: () => void) => {
    if (p.busyId) return;
    if (dirty) { pendingLeave.current = then; setWarn(true); return; }
    setWarn(false); setDirty(false); then();
  };
  const back = () => inForm ? requestLeaveForm(() => p.setView({ mode: 'list' })) : p.onClose();
  const close = () => inForm ? requestLeaveForm(p.onClose) : p.onClose();

  return <Modal visible transparent animationType={wide ? 'fade' : 'slide'} onRequestClose={back} statusBarTranslucent>
    <View style={[r.backdrop, wide ? { justifyContent: 'center', alignItems: 'center' } : { justifyContent: 'flex-end' }]}>
      <Pressable style={StyleSheet.absoluteFill} accessibilityLabel="Close reward manager" onPress={close} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ width: wide ? Math.min(560, width - 48) : '100%', maxHeight: sheetHeight }}>
        <View accessibilityViewIsModal style={[r.sheet, wide ? r.sheetWide : r.sheetMobile, { height: sheetHeight, paddingBottom: wide ? 0 : Math.max(insets.bottom, Platform.OS === 'web' ? 34 : 12) }]}>
          {!wide && <View style={r.grabber} />}
          <View style={r.header}>
            {inForm
              ? <IconBtn icon="arrow-left" label="Back to reward list" testID="reward-form-back" onPress={back} disabled={!!p.busyId} />
              : <View style={r.badge}><Feather name="gift" size={18} color={C.primary} /></View>}
            <View style={{ flex: 1 }}>
              <T style={r.headerTitle} accessibilityRole="header">{inForm ? (p.view.mode === 'form' && p.view.id ? 'Edit reward' : 'New reward') : 'Reward pool'}</T>
              <T style={[s.muted, { fontSize: 12 }]}>{inForm ? 'Saved only when you tap Save.' : `${selectedCount} of ${p.options.length} in the random draw`}</T>
            </View>
            <IconBtn icon="x" label="Close reward manager" testID="close-reward-manager" onPress={close} disabled={!!p.busyId} />
          </View>

          {p.view.mode === 'form'
            ? <RewardForm key={p.view.id ?? 'new'} initial={p.view.initial} editing={!!p.view.id} busy={!!p.busyId}
              notice={p.notice?.tone === 'error' ? p.notice.text : ''}
              warn={warn} onKeepEditing={() => { pendingLeave.current = null; setWarn(false); }}
              onDiscard={() => {
                if (p.busyId) return;
                const leave = pendingLeave.current;
                pendingLeave.current = null;
                setWarn(false); setDirty(false); leave?.();
              }}
              onDirty={setDirty}
              onCancel={() => requestLeaveForm(() => p.setView({ mode: 'list' }))}
              onSave={async data => {
                const id = p.view.mode === 'form' ? p.view.id : undefined;
                const ok = await p.onSave(data, id);
                if (ok) { setDirty(false); setWarn(false); p.setView({ mode: 'list' }); }
                return ok;
              }} />
            : <>
              <ScrollView style={{ flex: 1, minHeight: 0 }} contentContainerStyle={{ padding: 16, paddingTop: 4, gap: 8 }} keyboardShouldPersistTaps="handled">
                {p.options.length === 0 && <View style={r.empty}>
                  <Feather name="feather" size={24} color={C.primary} />
                  <T style={{ fontFamily: 'DM Sans Bold' }}>No rewards yet</T>
                  <T style={[s.muted, { textAlign: 'center' }]}>Add a few small celebrations. Five or more works nicely for variety.</T>
                </View>}
                {p.options.length > 0 && selectedCount === 0 && <T style={[s.muted, r.hint]}>None selected. Switch one on so a reward can be drawn.</T>}
                {p.options.map(option => {
                  const confirming = p.confirmDeleteId === option.id;
                  const saving = p.busyId === option.id;
                  return <View key={option.id} style={[r.row, option.enabled && r.rowOn]} testID={`reward-row-${option.id}`}>
                    <View style={[s.row, { flexWrap: 'nowrap', gap: 10 }]}>
                      <View style={[r.dot, option.enabled && { backgroundColor: C.paper }]}><Feather name={CATEGORY_ICON[option.category] ?? 'gift'} size={15} color={option.enabled ? C.primary : C.mutedForeground} /></View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <T style={r.rowTitle} numberOfLines={2}>{option.title}</T>
                        <T style={[s.muted, { fontSize: 12, lineHeight: 16 }]} numberOfLines={1}>{saving ? 'Saving…' : `${option.enabled ? 'In the draw' : 'Not in the draw'} · ${CATEGORY_LABEL[option.category] ?? option.category}`}</T>
                      </View>
                      <IconBtn icon="edit-2" small label={`Edit ${option.title}`} testID={`edit-reward-${option.id}`} disabled={!!p.busyId || confirming}
                        onPress={() => { p.clearNotice(); p.setConfirmDeleteId(null); p.setView({ mode: 'form', id: option.id, initial: inputFrom(option) }); }} />
                      <IconBtn icon="trash-2" small label={`Delete ${option.title}`} testID={`delete-reward-${option.id}`} disabled={!!p.busyId}
                        onPress={() => p.setConfirmDeleteId(confirming ? null : option.id)} />
                      <Switch testID={`reward-selected-${option.id}`}
                        accessibilityLabel={`Include ${option.title} in random rewards`}
                        accessibilityHint="Saves your selection for future Homework and Exam rewards"
                        trackColor={{ true: C.primary, false: C.input }} thumbColor={C.paper}
                        value={option.enabled} disabled={!!p.busyId || confirming}
                        onValueChange={enabled => p.onToggle(option, enabled)} />
                    </View>
                    {confirming && <View style={r.confirm}>
                      <T style={{ flex: 1, fontSize: 13, lineHeight: 18 }}>Remove from future draws? Earned rewards stay.</T>
                      <Pressable testID={`cancel-delete-reward-${option.id}`} accessibilityRole="button" disabled={!!p.busyId} onPress={() => p.setConfirmDeleteId(null)} style={r.smallGhost}><T style={r.smallGhostText}>Keep</T></Pressable>
                      <Pressable testID={`confirm-delete-reward-${option.id}`} accessibilityRole="button" accessibilityLabel={`Confirm remove ${option.title}`} disabled={!!p.busyId} onPress={() => p.onDelete(option.id)} style={[r.smallDanger, !!p.busyId && { opacity: .5 }]}><T style={r.smallDangerText}>{saving ? 'Removing…' : 'Remove'}</T></Pressable>
                    </View>}
                    {p.noticeId === option.id && p.notice && <T accessibilityRole="alert" style={[r.inline, p.notice.tone === 'error' && { color: C.destructive }]}>{p.notice.text}</T>}
                  </View>;
                })}
                {p.notice && !p.options.some(o => o.id === p.noticeId) && <T accessibilityRole="alert" style={[r.inline, p.notice.tone === 'error' && { color: C.destructive }]}>{p.notice.text}</T>}
                {p.refreshError && <T accessibilityRole="alert" style={[r.inline, { color: C.destructive }]}>Could not refresh rewards. Your last confirmed choices are shown.</T>}
              </ScrollView>
              <View style={r.footer}>
                <Pressable testID="add-reward" accessibilityRole="button" disabled={!!p.busyId}
                  onPress={() => { p.clearNotice(); p.setConfirmDeleteId(null); p.setView({ mode: 'form', initial: blank }); }}
                  style={({ pressed }) => [r.primary, (pressed || !!p.busyId) && { opacity: p.busyId ? .5 : .85 }]}>
                  <Feather name="plus" size={18} color={C.paper} /><T style={r.primaryText}>Add reward</T>
                </Pressable>
              </View>
            </>}
        </View>
      </KeyboardAvoidingView>
    </View>
  </Modal>;
}

function RewardForm({ initial, editing, busy, notice, warn, onKeepEditing, onDiscard, onDirty, onSave, onCancel }: {
  initial: RewardOptionInput; editing: boolean; busy: boolean; notice: string; warn: boolean;
  onKeepEditing: () => void; onDiscard: () => void; onDirty: (d: boolean) => void;
  onSave: (data: RewardOptionInput) => Promise<boolean>; onCancel: () => void;
}) {
  const [form, setFormState] = useState<RewardOptionInput>(initial);
  const [message, setMessage] = useState('');
  const submitting = useRef(false);
  const onDirtyRef = useRef(onDirty);
  onDirtyRef.current = onDirty;
  useEffect(() => { onDirtyRef.current(!same(form, initial)); }, [form, initial]);
  const setForm = setFormState;
  const valid = !!form.title.trim() && !!form.message.trim();
  const save = async () => {
    if (submitting.current || busy) return;
    const data = { ...form, title: form.title.trim(), message: form.message.trim() };
    if (!data.title || !data.message) { setMessage('A title and message are required.'); return; }
    submitting.current = true;
    setMessage('');
    const saved = await onSave(data);
    if (!saved) setMessage('Your changes are still here. Please retry.');
    submitting.current = false;
  };
  return <>
    <ScrollView style={{ flex: 1, minHeight: 0 }} contentContainerStyle={{ padding: 18, paddingTop: 6, gap: 8 }} keyboardShouldPersistTaps="handled">
      <T style={r.label}>Reward title</T>
      <TextInput testID="reward-title" accessibilityLabel="Reward title" placeholder="Pick tonight's story" placeholderTextColor={C.mutedForeground}
        style={r.input} maxLength={100} value={form.title} editable={!busy} autoFocus={!editing} onChangeText={title => setForm(c => ({ ...c, title }))} />
      <T style={r.label}>Your message to your child</T>
      <TextInput testID="reward-message" accessibilityLabel="Reward message" placeholder="You worked so carefully. You choose the bedtime story!" placeholderTextColor={C.mutedForeground}
        style={[r.input, { minHeight: 88, textAlignVertical: 'top' }]} multiline maxLength={300} value={form.message} editable={!busy} onChangeText={value => setForm(c => ({ ...c, message: value }))} />
      <T style={[s.muted, { fontSize: 11, alignSelf: 'flex-end' }]}>{form.message.length}/300</T>
      <T style={r.label}>Category (optional)</T>
      <View style={[s.row, { gap: 8 }]} accessibilityRole="radiogroup">
        {CATEGORIES.map(category => {
          const on = form.category === category;
          return <Pressable key={category} testID={`reward-category-${category}`} accessibilityRole="radio" accessibilityState={{ selected: on, disabled: busy }} disabled={busy}
            onPress={() => setForm(c => ({ ...c, category }))} style={[r.chip, on && r.chipOn]}>
            <Feather name={CATEGORY_ICON[category]} size={13} color={on ? C.primary : C.mutedForeground} />
            <T style={[{ fontSize: 13 }, on && { fontFamily: 'DM Sans Bold', color: C.primary }]}>{CATEGORY_LABEL[category]}</T>
          </Pressable>;
        })}
      </View>
      <View style={[r.toggleRow]}>
        <View style={{ flex: 1 }}><T style={{ fontFamily: 'DM Sans Bold', fontSize: 14 }}>Include in future draws</T><T style={[s.muted, { fontSize: 12 }]}>You can switch this any time from the list.</T></View>
        <Switch testID="reward-enabled" accessibilityLabel="Include this reward in future draws" trackColor={{ true: C.primary, false: C.input }} thumbColor={C.paper}
          value={form.enabled} disabled={busy} onValueChange={enabled => setForm(c => ({ ...c, enabled }))} />
      </View>
      <T style={[s.muted, { fontSize: 12 }]}>Earned rewards keep this exact title and message, even if you edit or remove it later.</T>
    </ScrollView>
    <View style={r.footer}>
      {warn && <View style={r.warn} accessibilityRole="alert">
        <T style={{ flex: 1, fontSize: 13, lineHeight: 18 }}>Discard your unsaved changes?</T>
        <Pressable testID="keep-editing-reward" accessibilityRole="button" onPress={onKeepEditing} style={r.smallGhost}><T style={r.smallGhostText}>Keep editing</T></Pressable>
        <Pressable testID="discard-reward-changes" accessibilityRole="button" onPress={onDiscard} style={r.smallDanger}><T style={r.smallDangerText}>Discard</T></Pressable>
      </View>}
      {!!(message || notice) && <T accessibilityRole="alert" style={[r.inline, { color: C.destructive }]}>{message || notice}</T>}
      <View style={[s.row, { flexWrap: 'nowrap', gap: 10 }]}>
        <Pressable testID="cancel-reward" accessibilityRole="button" disabled={busy} onPress={onCancel} style={[r.ghost, busy && { opacity: .5 }]}><T style={r.ghostText}>Cancel</T></Pressable>
        <Pressable testID="save-reward" accessibilityRole="button" accessibilityState={{ disabled: busy || !valid, busy }} disabled={busy || !valid} onPress={() => void save()}
          style={({ pressed }) => [r.primary, { flex: 1 }, (busy || !valid) && { opacity: .45 }, pressed && { opacity: .85 }]}>
          <T style={r.primaryText}>{busy ? 'Saving…' : editing ? 'Save changes' : 'Save reward'}</T>
        </Pressable>
      </View>
    </View>
  </>;
}

function IconBtn({ icon, label, onPress, disabled, testID, small }: { icon: React.ComponentProps<typeof Feather>['name']; label: string; onPress: () => void; disabled?: boolean; testID?: string; small?: boolean }) {
  return <Pressable testID={testID} accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={onPress} hitSlop={6}
    style={({ pressed }) => [r.iconBtn, small && { width: 34, height: 34, backgroundColor: 'transparent', borderWidth: 0 }, { opacity: disabled ? .35 : pressed ? .6 : 1 }]}>
    <Feather name={icon} size={small ? 16 : 19} color={C.primary} />
  </Pressable>;
}

const r = StyleSheet.create({
  summary: { padding: 16, borderRadius: 22, backgroundColor: C.paper, borderWidth: 1, borderColor: C.border, marginVertical: 8, gap: 10, borderLeftWidth: 5, borderLeftColor: C.butter },
  badge: { width: 40, height: 40, borderRadius: 14, backgroundColor: C.butter, alignItems: 'center', justifyContent: 'center' },
  summaryTitle: { fontFamily: 'Fredoka SemiBold', fontSize: 20, lineHeight: 25 },
  preview: { fontSize: 13, lineHeight: 18, color: C.primary },
  skeleton: { height: 22, width: 140, borderRadius: 8, backgroundColor: C.muted, marginTop: 4 },
  summaryBtn: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.primary, paddingHorizontal: 16, minHeight: 44, borderRadius: 15 },
  summaryBtnText: { fontFamily: 'DM Sans Bold', color: C.paper, fontSize: 14 },
  backdrop: { flex: 1, backgroundColor: 'rgba(41,60,56,0.42)' },
  sheet: { backgroundColor: C.background, overflow: 'hidden' },
  sheetMobile: { borderTopLeftRadius: 28, borderTopRightRadius: 28 },
  sheetWide: { borderRadius: 28, borderWidth: 1, borderColor: C.border },
  grabber: { alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: C.input, marginTop: 8 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border, marginBottom: 8 },
  headerTitle: { fontFamily: 'Fredoka SemiBold', fontSize: 21, lineHeight: 26 },
  iconBtn: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: C.paper, borderWidth: 1, borderColor: C.border },
  row: { backgroundColor: C.paper, borderRadius: 16, borderWidth: 1, borderColor: C.border, paddingVertical: 10, paddingHorizontal: 12, gap: 8 },
  rowOn: { borderColor: C.primary, backgroundColor: '#f3faf5' },
  dot: { width: 32, height: 32, borderRadius: 11, backgroundColor: C.muted, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { fontFamily: 'DM Sans Bold', fontSize: 15, lineHeight: 20 },
  confirm: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fdeeea', borderRadius: 12, padding: 8 },
  warn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.butter, borderRadius: 12, padding: 8 },
  smallGhost: { paddingHorizontal: 10, minHeight: 34, borderRadius: 10, justifyContent: 'center', borderWidth: 1, borderColor: C.input, backgroundColor: C.paper },
  smallGhostText: { fontFamily: 'DM Sans Bold', fontSize: 13, color: C.primary },
  smallDanger: { paddingHorizontal: 12, minHeight: 34, borderRadius: 10, justifyContent: 'center', backgroundColor: C.destructive },
  smallDangerText: { fontFamily: 'DM Sans Bold', fontSize: 13, color: C.paper },
  inline: { fontSize: 13, lineHeight: 18, color: C.primary },
  hint: { backgroundColor: C.butter, padding: 10, borderRadius: 12, color: C.foreground },
  empty: { alignItems: 'center', gap: 6, padding: 24, borderRadius: 18, borderWidth: 1, borderStyle: 'dashed', borderColor: C.input, marginTop: 8 },
  footer: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 14, gap: 8, borderTopWidth: 1, borderTopColor: C.border, backgroundColor: C.background },
  primary: { flexDirection: 'row', gap: 8, minHeight: 50, borderRadius: 16, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  primaryText: { fontFamily: 'DM Sans Bold', color: C.paper, fontSize: 15 },
  ghost: { minHeight: 50, borderRadius: 16, borderWidth: 1, borderColor: C.input, backgroundColor: C.paper, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  ghostText: { fontFamily: 'DM Sans Bold', color: C.primary, fontSize: 15 },
  label: { fontFamily: 'DM Sans Bold', fontSize: 13, marginTop: 6 },
  input: { fontFamily: 'DM Sans', fontSize: 15, color: C.foreground, backgroundColor: C.paper, borderWidth: 1.5, borderColor: C.input, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, minHeight: 36, borderRadius: 18, borderWidth: 1, borderColor: C.input, backgroundColor: C.paper },
  chipOn: { backgroundColor: C.mint, borderColor: C.primary },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.paper, borderRadius: 14, borderWidth: 1, borderColor: C.border, padding: 12, marginTop: 8 },
});
