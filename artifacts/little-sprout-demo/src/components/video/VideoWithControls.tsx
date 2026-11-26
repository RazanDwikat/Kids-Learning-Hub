import { useEffect, useRef, useState } from 'react';
import {
  Play,
  Pause,
  Repeat,
  Volume2,
  VolumeX,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import VideoTemplate, { SCENE_DURATIONS } from './VideoTemplate';
import { useSceneControls } from './useSceneControls';
import { SCENE_DETAILS } from './sceneMeta';

function Status({
  controls,
  onJump,
}: {
  controls: ReturnType<typeof useSceneControls>;
  onJump: (index: number) => void;
}) {
  const [elapsed, setElapsed] = useState(0);
  const base = useRef(0);

  useEffect(() => {
    base.current = 0;
    setElapsed(0);
  }, [controls.tick]);

  useEffect(() => {
    if (controls.paused) return;
    const startedAt = performance.now();
    const interval = setInterval(
      () => setElapsed(base.current + performance.now() - startedAt),
      60,
    );
    return () => {
      clearInterval(interval);
      base.current += performance.now() - startedAt;
    };
  }, [controls.tick, controls.paused]);

  const format = (ms: number) =>
    `${Math.floor(ms / 60000)}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')}`;

  return (
    <>
      <div className="segments">
        {controls.keys.map((key, index) => (
          <button
            key={key}
            aria-label={`Jump to ${SCENE_DETAILS[key.replace(/_r[12]$/, '')].title}`}
            onClick={() => onJump(index)}
          >
            <i
              style={{
                transform: `scaleX(${index === controls.activeIndex ? Math.min(1, elapsed / controls.duration) : 0})`,
              }}
            />
          </button>
        ))}
      </div>
      <span className="timer">
        {controls.activeIndex + 1}/{controls.keys.length} &nbsp;
        {format(controls.start + Math.min(elapsed, controls.duration))} /{' '}
        {format(controls.total)}
      </span>
    </>
  );
}

export default function VideoWithControls() {
  const controls = useSceneControls(SCENE_DURATIONS);
  const [muted, setMuted] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [hover, setHover] = useState(false);

  useEffect(() => {
    if (!controls.paused || typeof document.getAnimations !== 'function') return;
    const animations = document
      .getAnimations()
      .filter((animation) => animation.playState === 'running');
    animations.forEach((animation) => animation.pause());
    return () => animations.forEach((animation) => animation.play());
  }, [controls.paused]);

  const visible = !collapsed || hover;

  return (
    <div style={{ position: 'relative' }}>
      <VideoTemplate
        key={controls.mountKey}
        durations={controls.durations}
        paused={controls.paused}
        muted={muted}
        onSceneChange={controls.onSceneChange}
      />
      <div
        className="controls"
        onPointerEnter={(event) => {
          if (event.pointerType === 'mouse') setHover(true);
        }}
        onPointerLeave={() => setHover(false)}
        onPointerDown={(event) => {
          if (event.pointerType !== 'mouse') setCollapsed(false);
        }}
      >
        <div
          className="bar"
          style={{
            transform: visible ? 'translateY(0)' : 'translateY(100%)',
            opacity: visible ? 1 : 0,
          }}
        >
          <button
            aria-label={controls.paused ? 'Play' : 'Pause'}
            onClick={controls.togglePause}
          >
            {controls.paused ? <Play /> : <Pause />}
          </button>
          <button
            aria-label="Loop current scene"
            aria-pressed={controls.locked}
            onClick={controls.toggleLock}
            style={{ color: controls.locked ? '#ffe7a9' : undefined }}
          >
            <Repeat />
          </button>
          <button
            aria-label={muted ? 'Unmute' : 'Mute'}
            onClick={() => setMuted((value) => !value)}
          >
            {muted ? <VolumeX /> : <Volume2 />}
          </button>
          <Status controls={controls} onJump={controls.jumpTo} />
          <button
            aria-label={collapsed ? 'Show controls' : 'Hide controls'}
            onClick={() => {
              setCollapsed((value) => !value);
              setHover(false);
            }}
          >
            {collapsed ? <ChevronUp /> : <ChevronDown />}
          </button>
        </div>
      </div>
    </div>
  );
}
