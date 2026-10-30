import { useState } from 'react';

const demoLink = 'https://drive.google.com/file/d/1i21QSDuVHp4lJEj1QpC_zUCvFuciONcm/view?usp=sharing';
const recording = import.meta.env.VITE_DEMO_VIDEO_URL;

export default function VideoWithControls() {
  const [failed, setFailed] = useState(false);
  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeContent: 'center', padding: 24,
      background: '#fff9ef', color: '#397567', fontFamily: 'sans-serif', textAlign: 'center' }}>
      <h1>Little Sprout — App walkthrough</h1>
      {recording && !failed ? (
        <video src={recording} controls playsInline preload="metadata" onError={() => setFailed(true)}
          style={{ width: 'min(100%, 1100px)', maxHeight: '75vh', margin: 'auto' }} />
      ) : (
        <p>{failed ? 'The hosted recording could not be loaded.' : 'The full narrated walkthrough is hosted on Google Drive.'}</p>
      )}
      <p><a href={demoLink} target="_blank" rel="noreferrer" style={{ color: 'inherit' }}>Watch the full demo on Google Drive</a></p>
    </main>
  );
}
