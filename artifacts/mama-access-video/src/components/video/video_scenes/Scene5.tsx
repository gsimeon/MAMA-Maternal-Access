import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { springs, easings } from '@/lib/video';

export const Scene5 = () => {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 1500),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 w-full h-full flex flex-col justify-center items-center pb-[10vh]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, filter: 'blur(20px)' }}
      transition={{ duration: 1 }}
      style={{ zIndex: 10 }}
    >
      <motion.div
        className="text-center mt-[20vh]"
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ ...springs.smooth, delay: 0.5 }}
      >
        <h1 className="font-display font-bold text-[12vw] tracking-tighter text-white mb-0 leading-none drop-shadow-lg">
          MAMA
        </h1>
        <motion.p
          className="font-body text-[3vw] text-primary font-bold tracking-widest uppercase mt-4"
          initial={{ opacity: 0, letterSpacing: '0em' }}
          animate={phase >= 1 ? { opacity: 1, letterSpacing: '0.2em' } : {}}
          transition={{ duration: 1.5, ease: easings.easeOut.ease }}
        >
          Maternal Access
        </motion.p>
      </motion.div>
    </motion.div>
  );
};
