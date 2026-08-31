import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { springs, easings } from '@/lib/video';

export const Scene2 = () => {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 600),
      setTimeout(() => setPhase(2), 1800),
      setTimeout(() => setPhase(3), 2800),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  const transcriptionLines = [
    { lang: 'Swahili', text: 'Nina maumivu makali ya kichwa.', eng: 'Severe headache reported.' },
    { lang: 'Hausa', text: 'Sina jin motsin jariri.', eng: 'Fetal movement decreased.' },
    { lang: 'Yoruba', text: 'Ina jiri sosai.', eng: 'Experiencing severe dizziness.' }
  ];

  return (
    <motion.div 
      className="absolute inset-0 w-full h-full flex items-center pl-[40vw] pr-[5vw]"
      initial={{ clipPath: 'inset(0% 0% 0% 100%)' }}
      animate={{ clipPath: 'inset(0% 0% 0% 0%)' }}
      exit={{ opacity: 0, x: -50 }}
      transition={{ duration: 1, ease: easings.easeOut.ease }}
      style={{ zIndex: 10 }}
    >
      <div className="flex flex-col w-full h-full justify-center">
        
        <motion.h2 
          className="font-display font-bold text-[4.5vw] leading-[1.1] text-text-primary mb-[6vh]"
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ ...springs.smooth, delay: 0.3 }}
        >
          She speaks <span className="text-accent">her language</span>.
        </motion.h2>

        <div className="space-y-[3vh] w-full">
          {transcriptionLines.map((line, i) => (
            <motion.div 
              key={i}
              className="relative w-full h-[8vh] bg-white/50 backdrop-blur-md rounded-2xl border border-white/40 flex items-center px-[2vw] overflow-hidden shadow-lg"
              initial={{ opacity: 0, y: 20 }}
              animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
              transition={{ ...springs.snappy, delay: 0.5 + i * 0.15 }}
            >
              {/* Native Language Text */}
              <motion.div 
                className="absolute inset-0 flex items-center px-[2vw]"
                animate={phase >= 2 ? { y: '-100%', opacity: 0 } : { y: '0%', opacity: 1 }}
                transition={{ duration: 0.6, ease: easings.easeOut.ease, delay: i * 0.2 }}
              >
                <span className="font-mono text-[1vw] text-text-muted mr-[1vw] bg-black/5 px-2 py-1 rounded">{line.lang}</span>
                <span className="font-body text-[2vw] text-text-primary font-medium">{line.text}</span>
              </motion.div>

              {/* English Structured Data */}
              <motion.div 
                className="absolute inset-0 flex items-center px-[2vw] bg-primary/10"
                initial={{ y: '100%', opacity: 0 }}
                animate={phase >= 2 ? { y: '0%', opacity: 1 } : { y: '100%', opacity: 0 }}
                transition={{ duration: 0.6, ease: easings.easeOut.ease, delay: i * 0.2 }}
              >
                <span className="font-mono text-[1vw] text-primary mr-[1vw] bg-primary/20 px-2 py-1 rounded">Structured</span>
                <span className="font-body text-[2vw] text-text-primary font-bold">{line.eng}</span>
              </motion.div>
            </motion.div>
          ))}
        </div>

        <motion.p
          className="font-body text-[2vw] text-text-secondary mt-[6vh]"
          initial={{ opacity: 0 }}
          animate={{ opacity: phase >= 3 ? 1 : 0 }}
          transition={{ duration: 0.8 }}
        >
          MAMA translates and structures clinical data instantly.
        </motion.p>
      </div>
    </motion.div>
  );
};
