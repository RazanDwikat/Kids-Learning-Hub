import React, { useState } from 'react';
import { Switch, TextInput, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { getGetRewardConfigQueryKey, useGetRewardConfig, useSaveRewardConfig } from '@workspace/api-client-react';
import type { RewardConfig } from '@workspace/api-client-react';
import { Action, Card, Failure, Heading, Loading, T, styles as s } from './ui';

export function RewardSettings() {
  const query = useGetRewardConfig();
  const [open, setOpen] = useState(false);
  return <Card><Heading>A celebration you choose</Heading><T style={s.muted}>Set an optional reward for future exams. Nothing is promised unless you enable it.</T><Action testID="configure-exam-reward" title={open ? 'Close reward settings' : 'Configure exam reward'} secondary onPress={() => setOpen(!open)} />{open && (query.isPending ? <Loading /> : query.isError ? <Failure retry={() => void query.refetch()} /> : <RewardForm initial={query.data} />)}</Card>;
}
function RewardForm({ initial }: { initial: RewardConfig }) {
  const [form, setForm] = useState(initial);
  const [message, setMessage] = useState('');
  const save = useSaveRewardConfig();
  const cache = useQueryClient();
  return <View style={{ gap: 12 }}>
    <View style={s.row}><Switch testID="reward-enabled" accessibilityLabel="Enable parent reward" value={form.enabled} disabled={save.isPending} onValueChange={enabled => { setForm({ ...form, enabled }); setMessage(''); }} /><T>Offer a parent reward</T></View>
    <T style={s.muted}>Category</T><View style={s.row}>{(['activity', 'screen_time', 'snack', 'other'] as const).map(category => <Action key={category} testID={`reward-category-${category}`} secondary={form.category !== category} disabled={save.isPending} title={{ activity: 'Play together', screen_time: 'Screen time', snack: 'Snack', other: 'Your own idea' }[category]} onPress={() => { setForm({ ...form, category }); setMessage(''); }} />)}</View>
    <T>Reward title</T><TextInput testID="reward-title" accessibilityLabel="Reward title" style={[s.choice, s.text]} maxLength={100} value={form.title} editable={!save.isPending} onChangeText={title => { setForm({ ...form, title }); setMessage(''); }} />
    <T>Your message to your child</T><TextInput testID="reward-message" accessibilityLabel="Reward message" style={[s.choice, s.text, { minHeight: 92 }]} multiline maxLength={300} value={form.message} editable={!save.isPending} onChangeText={value => { setForm({ ...form, message: value }); setMessage(''); }} />
    <T style={s.muted}>The reward is saved when an exam is completed. Finished adventures keep their celebration.</T>
    <Action testID="save-reward" title={save.isPending ? 'Saving…' : 'Save reward settings'} disabled={save.isPending || !form.title.trim()} onPress={() => { setMessage(''); save.mutate({ data: { ...form, title: form.title.trim() } }, { onSuccess: data => { cache.setQueryData(getGetRewardConfigQueryKey(), data); setMessage('Saved. Your next exam will use these settings.'); }, onError: () => setMessage('Could not save. Your changes are still here; please retry.') }); }} />
    {!!message && <T accessibilityLiveRegion="polite">{message}</T>}
  </View>;
}