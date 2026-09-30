import React, { useRef, useState } from 'react';
import { Switch, TextInput, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { getListRewardOptionsQueryKey, useListRewardOptions, useCreateRewardOption, useUpdateRewardOption, useDeleteRewardOption } from '@workspace/api-client-react';
import type { RewardOption, RewardOptionInput } from '@workspace/api-client-react';
import { Action, C, Card, Failure, Heading, Loading, T, styles as s } from './ui';

const blank: RewardOptionInput = { enabled: true, category: 'activity', title: '', message: '' };
const inputFrom = (option: RewardOption): RewardOptionInput => ({
  enabled: option.enabled, category: option.category, title: option.title, message: option.message,
});

export function RewardSettings() {
  const query = useListRewardOptions();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const busy = useRef(false);
  const cache = useQueryClient();
  const create = useCreateRewardOption();
  const update = useUpdateRewardOption();
  const remove = useDeleteRewardOption();
  const key = getListRewardOptionsQueryKey();
  const options = query.data ?? [];
  const selectedCount = options.filter(option => option.enabled).length;

  // All writes are serialized. In particular, a toggle must never submit an old
  // title/message over an edit or another toggle while their requests are in flight.
  const save = async (data: RewardOptionInput, id?: string): Promise<boolean> => {
    if (busy.current) return false;
    busy.current = true;
    setBusyId(id ?? 'new');
    setNotice('');
    try {
      await cache.cancelQueries({ queryKey: key });
      const saved = id ? await update.mutateAsync({ rewardId: id, data }) : await create.mutateAsync({ data });
      await cache.cancelQueries({ queryKey: key });
      cache.setQueryData<RewardOption[]>(key, old => id
        ? old?.map(option => option.id === id ? saved : option)
        : old ? [...old, saved] : [saved]);
      setNotice(id ? 'Reward changes saved for future adventures.' : 'Reward added to your pool.');
      return true;
    } catch {
      setNotice('Could not confirm the save. Refreshing your saved choices; check the list before retrying.');
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
    setNotice('');
    try {
      await cache.cancelQueries({ queryKey: key });
      await remove.mutateAsync({ rewardId: id });
      await cache.cancelQueries({ queryKey: key });
      cache.setQueryData<RewardOption[]>(key, old => old?.filter(option => option.id !== id));
      setConfirmDeleteId(null);
      setEditingId(null);
      setNotice('Reward removed. Previously earned rewards stay the same.');
    } catch {
      setNotice('Could not confirm removal. Refreshing your saved choices; check the list before retrying.');
      void cache.invalidateQueries({ queryKey: key });
    } finally {
      busy.current = false;
      setBusyId(null);
    }
  };

  return <Card tint={C.butter}>
    <Heading>Choose the reward pool</Heading>
    <T>When a child finishes Homework or an Exam, one selected reward is chosen at random from this pool. Practice does not award a reward.</T>
    {query.isPending ? <Loading /> : query.isError && !query.data ? <Failure retry={() => void query.refetch()} message="Could not load the reward pool. Please retry." /> : <>
      <T style={{ fontFamily: 'DM Sans Bold' }} testID="reward-selected-count">{selectedCount} selected of {options.length} {options.length === 1 ? 'reward' : 'rewards'}</T>
      {options.length === 0
        ? <T style={s.muted}>Your pool is empty. Add as many rewards as you like (five or more is fine). No configured reward will be awarded until you select one.</T>
        : selectedCount === 0
          ? <T style={s.muted}>None selected. No configured reward will be awarded until you include at least one.</T>
          : <T style={s.muted}>{selectedCount === 1 ? 'Your one selected reward will always be chosen.' : 'Every selected reward is a possible surprise; exactly one is chosen per completed adventure.'}</T>}
      {options.map(option => <Card key={option.id}>
        <View style={[s.row, { justifyContent: 'space-between' }]}>
          <View style={{ flex: 1, minWidth: 150 }}>
            <T style={{ fontFamily: 'DM Sans Bold', fontSize: 17 }}>{option.title}</T>
            <T style={s.muted}>{option.enabled ? 'In the random draw' : 'Not in the draw'} · {option.category.replace('_', ' ')}</T>
          </View>
          <Switch
            testID={`reward-selected-${option.id}`}
            accessibilityLabel={`Include ${option.title} in random rewards`}
            accessibilityHint="Saves your selection for future Homework and Exam rewards"
            trackColor={{ true: C.primary, false: C.input }}
            value={option.enabled}
            disabled={!!busyId || editingId === option.id || confirmDeleteId === option.id}
            onValueChange={enabled => { void save({ ...inputFrom(option), enabled }, option.id); }}
          />
        </View>
        <T>{option.message}</T>
        {busyId === option.id && <T style={s.muted}>Saving…</T>}
        <View style={s.row}>
          <Action testID={`edit-reward-${option.id}`} title={editingId === option.id ? 'Cancel edit' : 'Edit'} secondary disabled={!!busyId || (confirmDeleteId === option.id)} onPress={() => {
            setEditingId(editingId === option.id ? null : option.id);
            setAdding(false);
            setNotice('');
          }} />
          <Action testID={`delete-reward-${option.id}`} title={confirmDeleteId === option.id ? 'Cancel delete' : 'Delete'} secondary disabled={!!busyId || editingId === option.id} onPress={() => {
            setConfirmDeleteId(confirmDeleteId === option.id ? null : option.id);
            setNotice('');
          }} />
        </View>
        {confirmDeleteId === option.id && <View>
          <T>Remove “{option.title}” from future draws?</T>
          <Action testID={`confirm-delete-reward-${option.id}`} title="Yes, remove reward" disabled={!!busyId} onPress={() => void deleteOption(option.id)} />
        </View>}
        {editingId === option.id && <RewardForm key={option.id} initial={inputFrom(option)} disabled={!!busyId}
          onSave={async data => { const saved = await save(data, option.id); if (saved) setEditingId(null); return saved; }}
          onCancel={() => setEditingId(null)} />}
      </Card>)}
      <Action testID="add-reward" title={adding ? 'Cancel new reward' : 'Add a reward'} secondary disabled={!!busyId} onPress={() => {
        setAdding(!adding);
        setEditingId(null);
        setConfirmDeleteId(null);
        setNotice('');
      }} />
      {adding && <RewardForm key="new" initial={blank} disabled={!!busyId}
        onSave={async data => { const saved = await save(data); if (saved) setAdding(false); return saved; }}
        onCancel={() => setAdding(false)} />}
      {!!notice && <T accessibilityRole="alert">{notice}</T>}
      {query.isError && <T accessibilityRole="alert">Could not refresh rewards. Your last confirmed choices are shown.</T>}
    </>}
  </Card>;
}

function RewardForm({ initial, disabled, onSave, onCancel }: {
  initial: RewardOptionInput;
  disabled: boolean;
  onSave: (data: RewardOptionInput) => Promise<boolean>;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<RewardOptionInput>(initial);
  const [message, setMessage] = useState('');
  const submitting = useRef(false);
  const save = async () => {
    if (submitting.current || disabled) return;
    const data = { ...form, title: form.title.trim(), message: form.message.trim() };
    if (!data.title || !data.message) { setMessage('A title and message are required.'); return; }
    submitting.current = true;
    setMessage('');
    const saved = await onSave(data);
    if (!saved) setMessage('Your changes are still here. Please retry.');
    submitting.current = false;
  };
  return <View style={{ gap: 12 }}>
    <View style={s.row}><Switch testID="reward-enabled" accessibilityLabel="Include this reward in future draws" value={form.enabled} disabled={disabled} onValueChange={enabled => setForm(current => ({ ...current, enabled }))} /><T>Include in future draws</T></View>
    <T style={s.muted}>Category (optional)</T><View style={s.row}>{(['activity', 'screen_time', 'snack', 'other'] as const).map(category => <Action key={category} testID={`reward-category-${category}`} secondary={form.category !== category} disabled={disabled} title={{ activity: 'Play together', screen_time: 'Screen time', snack: 'Snack', other: 'Your own idea' }[category]} onPress={() => setForm(current => ({ ...current, category }))} />)}</View>
    <T>Reward title</T><TextInput testID="reward-title" accessibilityLabel="Reward title" style={[s.choice, s.text]} maxLength={100} value={form.title} editable={!disabled} onChangeText={title => setForm(current => ({ ...current, title }))} />
    <T>Your message to your child</T><TextInput testID="reward-message" accessibilityLabel="Reward message" style={[s.choice, s.text, { minHeight: 92 }]} multiline maxLength={300} value={form.message} editable={!disabled} onChangeText={value => setForm(current => ({ ...current, message: value }))} />
    <T style={s.muted}>Earned rewards keep this exact title and message, even if you edit or remove an option later.</T>
    <Action testID="save-reward" title={disabled ? 'Saving…' : 'Save reward'} disabled={disabled || !form.title.trim() || !form.message.trim()} onPress={() => void save()} />
    <Action title="Cancel" secondary disabled={disabled} onPress={onCancel} />
    {!!message && <T accessibilityRole="alert">{message}</T>}
  </View>;
}