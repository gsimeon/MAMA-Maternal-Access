import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { springs, easings } from '@/lib/video';

export const Scene1 = () => {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 1500),
      setTimeout(() => setPhase(3), 3000),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 w-full h-full flex flex-col justify-end items-center text-center pb-[20vh] px-[10vw]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.05, filter: 'blur(10px)' }}
      transition={{ duration: 1 }}
      style={{ zIndex: 10 }}
    >
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ ...springs.smooth, delay: 0.2 }}
      >
        <h1 className="font-display font-bold text-[5vw] leading-[1.1] tracking-tight text-white mb-[3vh]">
          Maternal care shouldn't <br />
          <motion.span 
            className="text-primary inline-block"
            animate={phase >= 2 ? { scale: [1, 1.05, 1] } : {}}
            transition={{ duration: 1 }}
          >
            depend on typing.
          </motion.span>
        </h1>

        <motion.p
          className="font-body text-[2vw] text-white/80 max-w-[50vw] mx-auto"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: phase >= 1 ? 0 : 20, opacity: phase >= 1 ? 1 : 0 }}
          transition={{ ...springs.gentle }}
        >
          Introducing a voice-first lifeline for expectant mothers.
        </motion.p>
      </motion.div>
    </motion.div>
  );
};
