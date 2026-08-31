import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { springs, easings } from '@/lib/video';
import { ShieldAlert, CheckCircle2 } from 'lucide-react';

export const Scene3 = () => {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 1200),
      setTimeout(() => setPhase(3), 2000),
      setTimeout(() => setPhase(4), 2800),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 w-full h-full flex flex-col items-center justify-end pb-[10vh]"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, filter: 'blur(15px)' }}
      transition={{ duration: 1 }}
      style={{ zIndex: 10 }}
    >
      <motion.h2 
        className="absolute top-[10vh] font-display font-bold text-[4.5vw] text-white"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...springs.smooth, delay: 0.3 }}
      >
        Instant <span className="text-accent">Safety Routing</span>
      </motion.h2>

      <div className="relative w-full h-[50vh] flex justify-center items-center mt-[15vh]">
        {/* Connecting Lines */}
        <svg className="absolute inset-0 w-full h-full" style={{ zIndex: 0 }}>
          <motion.path 
            d="M 50% 10% Q 30% 50% 25% 70%" 
            fill="none" 
            stroke="var(--color-success)" 
            strokeWidth="4" 
            strokeDasharray="8 8"
            initial={{ pathLength: 0 }}
            animate={phase >= 2 ? { pathLength: 1 } : { pathLength: 0 }}
            transition={{ duration: 1, ease: "linear" }}
          />
          <motion.path 
            d="M 50% 10% Q 70% 50% 75% 70%" 
            fill="none" 
            stroke="var(--color-error)" 
            strokeWidth="4" 
            initial={{ pathLength: 0 }}
            animate={phase >= 3 ? { pathLength: 1 } : { pathLength: 0 }}
            transition={{ duration: 1, ease: "linear" }}
          />
        </svg>

        {/* Routine Node */}
        <motion.div 
          className="absolute left-[15vw] top-[70%] bg-success/20 border-2 border-success rounded-3xl p-[2vw] backdrop-blur-md flex flex-col items-center shadow-[0_0_30px_rgba(16,185,129,0.3)]"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={phase >= 2 ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.5 }}
          transition={{ ...springs.bouncy }}
        >
          <CheckCircle2 className="w-[4vw] h-[4vw] text-success mb-2" />
          <span className="font-display font-bold text-[1.5vw] text-white">Routine Question</span>
          <span className="font-body text-[1vw] text-success font-bold mt-1">Automated Guidance</span>
        </motion.div>

        {/* Danger Node */}
        <motion.div 
          className="absolute right-[15vw] top-[70%] bg-error/20 border-2 border-error rounded-3xl p-[2vw] backdrop-blur-md flex flex-col items-center shadow-[0_0_40px_rgba(239,68,68,0.5)]"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={phase >= 3 ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.5 }}
          transition={{ ...springs.stiff }}
        >
          <motion.div
            animate={phase >= 4 ? { scale: [1, 1.2, 1] } : {}}
            transition={{ duration: 0.5, repeat: Infinity }}
          >
            <ShieldAlert className="w-[4vw] h-[4vw] text-error mb-2" />
          </motion.div>
          <span className="font-display font-bold text-[1.5vw] text-white">Danger Sign</span>
          <span className="font-body text-[1vw] text-error font-bold mt-1">Clinical Escalation</span>
        </motion.div>
      </div>

    </motion.div>
  );
};
