import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { springs, easings } from '@/lib/video';

export const Scene4 = () => {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 800),
      setTimeout(() => setPhase(2), 1600),
      setTimeout(() => setPhase(3), 2400),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 w-full h-full"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.8 }}
      style={{ zIndex: 10 }}
    >
      
      <motion.h2 
        className="absolute top-[15vh] w-full text-center font-display font-bold text-[4.5vw] text-text-primary"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...springs.smooth, delay: 0.3 }}
      >
        Always connected to <span className="text-primary">human support</span>.
      </motion.h2>

      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {/* Connecting pulse line */}
        <svg className="absolute w-[40vw] h-[10vh] left-[30vw] top-[45vh] overflow-visible">
          <motion.path
            d="M 0 50% L 100% 50%"
            stroke="var(--color-primary)"
            strokeWidth="6"
            strokeDasharray="10 10"
            fill="none"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={phase >= 1 ? { pathLength: 1, opacity: 0.5 } : { pathLength: 0, opacity: 0 }}
            transition={{ duration: 1, ease: "linear" }}
          />
          {/* Animated dot moving along line */}
          <motion.circle
            r="8"
            fill="var(--color-accent)"
            initial={{ cx: '0%', cy: '50%', opacity: 0 }}
            animate={phase >= 2 ? { cx: '100%', opacity: [0, 1, 1, 0] } : {}}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          />
        </svg>

        {/* Human Support Node */}
        <motion.div
          className="absolute left-[70vw] top-[50vh] -translate-x-1/2 -translate-y-1/2 w-[16vw] h-[16vw] rounded-full bg-white flex items-center justify-center shadow-[0_0_40px_rgba(255,255,255,1)] z-20"
          initial={{ scale: 0, opacity: 0 }}
          animate={phase >= 2 ? { scale: 1, opacity: 1 } : { scale: 0, opacity: 0 }}
          transition={{ ...springs.bouncy }}
        >
          <motion.img 
            src={`${import.meta.env.BASE_URL}images/mother-silhouette.png`}
            className="w-2/3 h-2/3 object-contain opacity-80"
            animate={phase >= 3 ? { rotate: [0, -5, 5, 0] } : {}}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          />
        </motion.div>
        
        {/* Helper text under human node */}
        <motion.div
          className="absolute left-[70vw] top-[calc(50vh+10vw)] -translate-x-1/2 text-center"
          initial={{ opacity: 0, y: 10 }}
          animate={phase >= 3 ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
          transition={{ ...springs.smooth }}
        >
          <span className="font-body text-[1.5vw] text-text-secondary font-medium">Midwife Escalation</span>
        </motion.div>
      </div>

    </motion.div>
  );
};
