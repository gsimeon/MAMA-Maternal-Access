import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import {
  ChevronDown,
  ChevronUp,
  Pause,
  Play,
  Repeat,
  Volume2,
  VolumeX,
} from 'lucide-react';
import VideoTemplate, { SCENE_DURATIONS } from './VideoTemplate';
import { useSceneControls } from './useSceneControls';

const SCENE_DETAILS: Record<string, { title: string; filePath: string }> = {
  intro: { title: 'A Voice for Every Mother', filePath: 'src/components/video/video_scenes/Scene1.tsx' },
  intake: { title: 'Language Access', filePath: 'src/components/video/video_scenes/Scene2.tsx' },
  routing: { title: 'Safety Routing', filePath: 'src/components/video/video_scenes/Scene3.tsx' },
  recovery: { title: 'Human Support', filePath: 'src/components/video/video_scenes/Scene4.tsx' },
  outro: { title: 'MAMA', filePath: 'src/components/video/video_scenes/Scene5.tsx' },
};

const PROGRESS_TICK_MS = 60;

function formatTime(durationMs: number) {
  const seconds = Math.max(0, Math.floor(durationMs / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

function PlaybackStatus({
  sceneKeys,
  activeIndex,
  activeDuration,
  activeStartTime,
  totalDuration,
  tick,
  paused,
  onJumpTo,
}: {
  sceneKeys: string[];
  activeIndex: number;
  activeDuration: number;
  activeStartTime: number;
  totalDuration: number;
  tick: number;
  paused: boolean;
  onJumpTo: (index: number) => void;
}) {
  const [elapsed, setElapsed] = useState(0);
  const elapsedBaseRef = useRef(0);

  useEffect(() => {
    setElapsed(0);
    elapsedBaseRef.current = 0;
  }, [tick]);

  useEffect(() => {
    if (paused) return;
    const start = performance.now();
    const id = window.setInterval(
      () => setElapsed(elapsedBaseRef.current + performance.now() - start),
      PROGRESS_TICK_MS,
    );
    return () => {
      window.clearInterval(id);
      elapsedBaseRef.current += performance.now() - start;
    };
  }, [paused, tick]);

  const progress = activeDuration ? Math.min(1, elapsed / activeDuration) : 0;
  const totalElapsed = Math.min(
    totalDuration,
    activeStartTime + Math.min(elapsed, activeDuration),
  );

  return (
    <>
      <div className="flex flex-1 items-center gap-[0.4vw]">
        {sceneKeys.map((key, index) => (
          <button
            key={key}
            onClick={() => onJumpTo(index)}
            className="relative h-[1.1vh] min-h-[8px] flex-1 overflow-hidden rounded-full bg-white/20"
            aria-label={`Jump to scene ${index + 1}: ${SCENE_DETAILS[key].title}`}
          >
            <span
              className="absolute inset-y-0 left-0 rounded-full bg-white/90"
              style={{ width: `${index === activeIndex ? progress * 100 : 0}%` }}
            />
          </button>
        ))}
      </div>
      <span className="font-mono text-[1.1vw] text-white/70">
        {activeIndex + 1}/{sceneKeys.length}
      </span>
      <span className="min-w-[10ch] text-right font-mono text-[1.1vw] text-white/80">
        {formatTime(totalElapsed)} / {formatTime(totalDuration)}
      </span>
    </>
  );
}

export default function VideoWithControls() {
  const isIframed = typeof window !== 'undefined' && window.self !== window.top;
  if (!isIframed) return <VideoTemplate />;
  return <PreviewPlayer />;
}

function PreviewPlayer() {
  const controls = useSceneControls(SCENE_DURATIONS);
  const [muted, setMuted] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [hovering, setHovering] = useState(false);
  const sensorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!controls.paused) return;
    const frozen = document
      .getAnimations()
      .filter((animation) => animation.playState === 'running');
    frozen.forEach((animation) => animation.pause());
    return () => frozen.forEach((animation) => animation.play());
  }, [controls.paused]);

  const handleJumpTo = useCallback(
    (index: number) => {
      controls.jumpTo(index);
      const key = controls.sceneKeys[index];
      const details = SCENE_DETAILS[key];
      window.parent.postMessage(
        {
          type: 'REPLIT_VIDEO_SCENE_SELECTED',
          payload: {
            sceneIndex: index,
            sceneCount: controls.sceneKeys.length,
            sceneTitle: details.title,
            filePath: details.filePath,
            lineNumber: 1,
          },
        },
        '*',
      );
    },
    [controls],
  );

  return (
    <div className="relative h-screen w-full overflow-hidden">
      <VideoTemplate
        key={controls.mountKey}
        durations={controls.durations}
        paused={controls.paused}
        muted={muted}
        onSceneChange={controls.onSceneChange}
      />
      <div
        ref={sensorRef}
        className="absolute inset-x-0 bottom-0 z-50 flex h-1/4 flex-col justify-end"
        onPointerEnter={(event: ReactPointerEvent) => {
          if (event.pointerType === 'mouse') setHovering(true);
        }}
        onPointerLeave={(event: ReactPointerEvent) => {
          if (event.pointerType === 'mouse') setHovering(false);
        }}
      >
        <div
          className={`flex items-center gap-[0.8vw] bg-black/55 px-[1.5vw] py-[1.2vh] backdrop-blur-md transition-all duration-200 ${
            !collapsed || hovering
              ? 'translate-y-0 opacity-100'
              : 'pointer-events-none translate-y-full opacity-0'
          }`}
        >
          <ControlButton
            label={controls.paused ? 'Play' : 'Pause'}
            onClick={controls.togglePause}
            icon={controls.paused ? <Play /> : <Pause />}
          />
          <ControlButton
            label={controls.locked ? 'Loop current scene: on' : 'Loop current scene: off'}
            onClick={controls.toggleLock}
            active={controls.locked}
            icon={<Repeat />}
          />
          <ControlButton
            label={muted ? 'Unmute' : 'Mute'}
            onClick={() => setMuted((value) => !value)}
            icon={muted ? <VolumeX /> : <Volume2 />}
          />
          <div className="h-[4vh] w-px bg-white/20" />
          <PlaybackStatus
            sceneKeys={controls.sceneKeys}
            activeIndex={controls.activeIndex}
            activeDuration={controls.activeDuration}
            activeStartTime={controls.activeStartTime}
            totalDuration={controls.totalDuration}
            tick={controls.tick}
            paused={controls.paused}
            onJumpTo={handleJumpTo}
          />
          <ControlButton
            label={collapsed ? 'Show controls' : 'Hide controls'}
            onClick={() => setCollapsed((value) => !value)}
            icon={collapsed ? <ChevronUp /> : <ChevronDown />}
          />
        </div>
      </div>
    </div>
  );
}

function ControlButton({
  label,
  onClick,
  icon,
  active = false,
}: {
  label: string;
  onClick: () => void;
  icon: ReactNode;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`flex h-[5vh] w-[5vh] min-h-9 min-w-9 shrink-0 items-center justify-center rounded-lg text-white transition-colors ${
        active ? 'bg-white/20' : 'text-white/70 hover:bg-white/10 hover:text-white'
      }`}
    >
      {icon}
    </button>
  );
}