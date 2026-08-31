import { useEffect, useRef, type ComponentType } from 'react';
import { useVideoPlayer, VideoPausedContext } from '@/lib/video';
import { AnimatePresence, motion } from 'framer-motion';
import { Scene1 } from './video_scenes/Scene1';
import { Scene2 } from './video_scenes/Scene2';
import { Scene3 } from './video_scenes/Scene3';
import { Scene4 } from './video_scenes/Scene4';
import { Scene5 } from './video_scenes/Scene5';

export const SCENE_DURATIONS = {
  intro: 4000,
  intake: 4500,
  routing: 5000,
  recovery: 4500,
  outro: 4000,
};

const SCENE_COMPONENTS: Record<string, ComponentType> = {
  intro: Scene1,
  intake: Scene2,
  routing: Scene3,
  recovery: Scene4,
  outro: Scene5,
};

const SCENE_START_SEC: Record<string, number> = (() => {
  const offsets: Record<string, number> = {};
  let cumulativeMs = 0;
  for (const [key, duration] of Object.entries(SCENE_DURATIONS)) {
    offsets[key] = cumulativeMs / 1000;
    cumulativeMs += duration;
  }
  return offsets;
})();

const AUDIO_SEEK_EPSILON_SEC = 0.18;

export default function VideoTemplate({
  durations = SCENE_DURATIONS,
  loop = true,
  paused = false,
  muted = false,
  onSceneChange,
}: {
  durations?: Record<string, number>;
  loop?: boolean;
  paused?: boolean;
  muted?: boolean;
  onSceneChange?: (sceneKey: string) => void;
} = {}) {
  const { currentSceneKey } = useVideoPlayer({ durations, loop, paused });
  const baseSceneKey = currentSceneKey.replace(/_r[12]$/, '');
  const sceneIndex = Object.keys(SCENE_DURATIONS).indexOf(baseSceneKey);
  const SceneComponent = SCENE_COMPONENTS[baseSceneKey];
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastSceneKeyRef = useRef<string | null>(null);

  useEffect(() => {
    onSceneChange?.(currentSceneKey);
  }, [currentSceneKey, onSceneChange]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = 0.45;
    if (paused) {
      audio.pause();
      return;
    }
    if (lastSceneKeyRef.current !== currentSceneKey) {
      lastSceneKeyRef.current = currentSceneKey;
      const targetTime = SCENE_START_SEC[baseSceneKey] ?? 0;
      if (Math.abs(audio.currentTime - targetTime) > AUDIO_SEEK_EPSILON_SEC) {
        audio.currentTime = targetTime;
      }
    }
    audio.play().catch(() => {});
  }, [currentSceneKey, baseSceneKey, muted, paused]);

  return (
    <VideoPausedContext.Provider value={paused}>
    <div
      className="w-full h-screen overflow-hidden relative"
      style={{ backgroundColor: 'var(--color-bg-dark)' }}
    >
      {/* PERSISTENT BACKGROUNDS OUTSIDE ANIMATEPRESENCE */}
      
      {/* Base gradient that shifts */}
      <motion.div 
        className="absolute inset-0 w-full h-full"
        animate={{
          background: sceneIndex === 0 || sceneIndex === 2 || sceneIndex === 4
            ? 'linear-gradient(135deg, var(--color-bg-dark) 0%, var(--color-text-primary) 100%)'
            : 'linear-gradient(135deg, var(--color-bg-light) 0%, #e2e8f0 100%)'
        }}
        transition={{ duration: 1.5, ease: "easeInOut" }}
      />

      {/* Warm organic overlay that fades in/out based on scene */}
      <motion.img 
        src={`${import.meta.env.BASE_URL}images/bg-warm-organic.jpg`}
        className="absolute inset-0 w-full h-full object-cover mix-blend-multiply opacity-0"
        animate={{
          opacity: sceneIndex === 1 || sceneIndex === 3 ? 0.7 : 0,
          scale: sceneIndex === 1 || sceneIndex === 3 ? 1.05 : 1.1,
          x: sceneIndex === 3 ? '-2vw' : '0vw'
        }}
        transition={{ duration: 3, ease: "easeOut" }}
      />
      
      <motion.img 
        src={`${import.meta.env.BASE_URL}images/bg-dark-teal.jpg`}
        className="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-0"
        animate={{
          opacity: sceneIndex === 0 || sceneIndex === 2 || sceneIndex === 4 ? 0.6 : 0,
          scale: sceneIndex === 2 ? 1.1 : 1
        }}
        transition={{ duration: 3, ease: "easeOut" }}
      />

      {/* PERSISTENT MAMA SYSTEM ORB */}
      <motion.div
        className="absolute rounded-full shadow-[0_0_50px_rgba(255,255,255,0.4)] flex items-center justify-center overflow-hidden z-20"
        initial={{ left: '50vw', top: '50vh', x: '-50%', y: '-50%', scale: 0, opacity: 0 }}
        animate={{
           left: sceneIndex === 0 ? '50vw' : 
              sceneIndex === 1 ? '20vw' : 
              sceneIndex === 2 ? '50vw' : 
              sceneIndex === 3 ? '30vw' : '50vw',
           top: sceneIndex === 0 ? '40vh' : 
              sceneIndex === 1 ? '50vh' : 
              sceneIndex === 2 ? '30vh' : 
              sceneIndex === 3 ? '50vh' : '40vh',
          x: '-50%',
          y: '-50%',
           scale: sceneIndex === 0 ? 1 : 
                  sceneIndex === 1 ? 0.7 : 
                  sceneIndex === 2 ? 0.6 : 
                  sceneIndex === 3 ? 0.8 : 1,
          opacity: 1,
           background: sceneIndex === 1 || sceneIndex === 3 
            ? 'linear-gradient(to bottom right, var(--color-primary), var(--color-accent))' 
            : 'linear-gradient(to bottom right, rgba(255,255,255,0.1), rgba(255,255,255,0.05))',
           backdropFilter: sceneIndex === 0 || sceneIndex === 2 || sceneIndex === 4 ? 'blur(10px)' : 'none',
           border: sceneIndex === 0 || sceneIndex === 2 || sceneIndex === 4 ? '1px solid rgba(255,255,255,0.2)' : 'none'
        }}
        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
        style={{ width: '16vw', height: '16vw', minWidth: '150px', minHeight: '150px' }}
      >
        <motion.img 
          src={`${import.meta.env.BASE_URL}images/voice-wave.png`}
          className="w-3/4 h-3/4 object-contain"
          animate={{
            rotate: [0, 10, -10, 0],
            scale: [1, 1.1, 1],
            opacity: sceneIndex === 1 || sceneIndex === 3 ? 0.9 : 1
          }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        />
      </motion.div>

      <AnimatePresence mode="popLayout">
        {SceneComponent && <SceneComponent key={currentSceneKey} />}
      </AnimatePresence>
      <audio
        ref={audioRef}
        src={`${import.meta.env.BASE_URL}audio/bg_music.mp3`}
        preload="auto"
        autoPlay
        muted={muted}
      />
    </div>
    </VideoPausedContext.Provider>
  );
}
