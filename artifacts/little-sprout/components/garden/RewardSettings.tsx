import React, { useState } from 'react';
import { Switch, TextInput, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { getListRewardOptionsQueryKey, useListRewardOptions, useCreateRewardOption, useUpdateRewardOption, useDeleteRewardOption } from '@workspace/api-client-react';
import type { RewardOption, RewardOptionInput } from '@workspace/api-client-react';
import { Action, Card, Failure, Heading, Loading, T, styles as s } from './ui';

const blank: RewardOptionInput = { enabled: true, category: 'activity', title: '', message: '' };

export function RewardSettings() {
  const query = useListRewardOptions();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<RewardOption | null>(null);
  const [adding, setAdding] = useState(false);
  const [notice, setNotice] = useState('');
  const cache = useQueryClient();
  const remove = useDeleteRewardOption();
  const refresh = () => void cache.invalidateQueries({ queryKey: getListRewardOptionsQueryKey() });
  return <Card><Heading>A celebration you choose</Heading><T style={s.muted}>Manage possible rewards for completed homework and exams. Only enabled choices can be drawn. No reward is promised when none are enabled.</T>
    <Action testID="configure-exam-reward" title={open ? 'Close reward settings' : 'Manage rewards'} secondary onPress={() => setOpen(!open)} />
    {open && (query.isPending ? <Loading /> : query.isError ? <Failure retry={() => void query.refetch()} /> : <>
      {!query.data?.length && <T>No reward options yet. Add one if you wish.</T>}
      {query.data?.map(option => <Card key={option.id}><T style={s.heading}>{option.title}</T><T>{option.message}</T><T style={s.muted}>{option.enabled ? 'Enabled' : 'Disabled'} · {option.category}</T>
        <View style={s.row}><Action testID={`edit-reward-${option.id}`} title="Edit" secondary onPress={() => { setEditing(option); setAdding(false); setNotice(''); }} />
          <Action testID={`delete-reward-${option.id}`} title="Delete" secondary disabled={remove.isPending} onPress={() => {
            setNotice(''); remove.mutate({ rewardId: option.id }, { onSuccess: () => { setEditing(null); refresh(); setNotice('Reward removed. Previously earned rewards stay the same.'); }, onError: () => setNotice('Could not remove this reward. Please retry.') });
          }} /></View>
        {editing?.id === option.id && <RewardForm key={option.id} initial={option} onDone={() => { setEditing(null); refresh(); }} />}
      </Card>)}
      <Action testID="add-reward" title={adding ? 'Cancel new reward' : 'Add a reward'} secondary onPress={() => { setAdding(!adding); setEditing(null); setNotice(''); }} />
      {adding && <RewardForm key="new" initial={blank} onDone={() => { setAdding(false); refresh(); }} />}
      {!!notice && <T accessibilityRole="alert">{notice}</T>}
    </>)}
  </Card>;
}

function RewardForm({ initial, onDone }: { initial: RewardOption | RewardOptionInput; onDone: () => void }) {
  const [form, setForm] = useState<RewardOptionInput>({ enabled: initial.enabled, category: initial.category, title: initial.title, message: initial.message });
  const [message, setMessage] = useState('');
  const create = useCreateRewardOption();
  const update = useUpdateRewardOption();
  const pending = create.isPending || update.isPending;
  const save = () => {
    const data = { ...form, title: form.title.trim(), message: form.message.trim() };
    if (!data.title || !data.message) { setMessage('A title and message are required.'); return; }
    setMessage('');
    const handlers = { onSuccess: onDone, onError: () => setMessage('Could not save. Your changes are still here; please retry.') };
    if ('id' in initial) update.mutate({ rewardId: initial.id, data }, handlers);
    else create.mutate({ data }, handlers);
  };
  return <View style={{ gap: 12 }}>
    <View style={s.row}><Switch testID="reward-enabled" accessibilityLabel="Enable parent reward" value={form.enabled} disabled={pending} onValueChange={enabled => setForm({ ...form, enabled })} /><T>Include in future draws</T></View>
    <T style={s.muted}>Category (optional)</T><View style={s.row}>{(['activity', 'screen_time', 'snack', 'other'] as const).map(category => <Action key={category} testID={`reward-category-${category}`} secondary={form.category !== category} disabled={pending} title={{ activity: 'Play together', screen_time: 'Screen time', snack: 'Snack', other: 'Your own idea' }[category]} onPress={() => setForm({ ...form, category })} />)}</View>
    <T>Reward title</T><TextInput testID="reward-title" accessibilityLabel="Reward title" style={[s.choice, s.text]} maxLength={100} value={form.title} editable={!pending} onChangeText={title => setForm({ ...form, title })} />
    <T>Your message to your child</T><TextInput testID="reward-message" accessibilityLabel="Reward message" style={[s.choice, s.text, { minHeight: 92 }]} multiline maxLength={300} value={form.message} editable={!pending} onChangeText={value => setForm({ ...form, message: value })} />
    <T style={s.muted}>Earned rewards keep this exact title and message, even if you edit or remove an option later.</T>
    <Action testID="save-reward" title={pending ? 'Saving…' : 'Save reward'} disabled={pending || !form.title.trim() || !form.message.trim()} onPress={save} />
    {!!message && <T accessibilityRole="alert">{message}</T>}
  </View>;
}