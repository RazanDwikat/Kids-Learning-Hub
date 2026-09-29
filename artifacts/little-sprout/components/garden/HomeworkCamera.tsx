import React, { useEffect, useRef, useState } from 'react';
import { Image, Linking, Platform, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Action, C, Card, T, styles as s } from './ui';

export type CapturedPage = { uri: string; base64?: string; mimeType: string };
export function HomeworkCamera({ photo, onPhoto, disabled }: { photo: CapturedPage | null; onPhoto: (photo: CapturedPage | null) => void; disabled: boolean }) {
  const [error, setError] = useState('');
  const [settings, setSettings] = useState(false);
  const [live, setLive] = useState(false);
  const stream = useRef<MediaStream | null>(null);
  const video = useRef<HTMLVideoElement | null>(null);
  const stop = () => { stream.current?.getTracks().forEach(track => track.stop()); stream.current = null; setLive(false); };
  useEffect(() => () => { stream.current?.getTracks().forEach(track => track.stop()); }, []);
  const capture = async () => {
    setError(''); setSettings(false);
    try {
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
        stream.current = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
        setLive(true); return;
      }
      if (Platform.OS !== 'web') {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) { setSettings(!permission.canAskAgain); setError('Camera access is needed to photograph the page. You can try again or choose a textbook page instead.'); return; }
      }
      const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], base64: true, quality: .8 });
      if (!result.canceled) { const asset = result.assets[0]; onPhoto({ uri: asset.uri, base64: asset.base64 ?? undefined, mimeType: asset.mimeType ?? 'image/jpeg' }); }
    } catch { stop(); setError('The camera could not open. Allow camera access in your browser or device settings, then try again. Textbook homework is still available.'); }
  };
  const snap = () => {
    const element = video.current;
    if (!element || !element.videoWidth) { setError('Your camera is still getting ready. Try taking the photo again.'); return; }
    const canvas = document.createElement('canvas'); canvas.width = element.videoWidth; canvas.height = element.videoHeight;
    canvas.getContext('2d')?.drawImage(element, 0, 0);
    const uri = canvas.toDataURL('image/jpeg', .8);
    onPhoto({ uri, base64: uri.split(',')[1], mimeType: 'image/jpeg' }); stop();
  };
  return <Card><T style={s.eyebrow}>PHOTOGRAPH THE WHOLE PAGE</T><T>Lay the page flat in good light. Keep every question inside the picture.</T>
    {live && Platform.OS === 'web' && <View><video ref={element => { video.current = element; if (element && stream.current && element.srcObject !== stream.current) element.srcObject = stream.current; }} autoPlay playsInline muted style={{ width: '100%', borderRadius: 20, backgroundColor: C.muted }} /><Action testID="camera-shutter" title="Take photo" onPress={snap} /><Action title="Cancel camera" secondary onPress={stop} /></View>}
    {photo && !live && <Image testID="homework-photo-preview" accessibilityLabel="Your photographed homework page" source={{ uri: photo.uri }} style={{ width: '100%', height: 300, borderRadius: 20, backgroundColor: C.muted }} resizeMode="contain" />}
    {!live && <Action testID={photo ? 'retake-homework-photo' : 'capture-homework-photo'} title={photo ? 'Retake photo' : 'Open camera'} disabled={disabled} onPress={() => void capture()} />}
    {!!error && <T accessibilityRole="alert">{error}</T>}
    {settings && Platform.OS !== 'web' && <Action title="Open camera settings" secondary onPress={() => { void Linking.openSettings().catch(() => setError('Open your device Settings and allow camera access for Little Sprout.')); }} />}
  </Card>;
}