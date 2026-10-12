'use client';

import { motion } from 'framer-motion';

export function FadeIn({ 
  children, 
  delay = 0, 
  direction = 'up',
  className = ''
}: { 
  children: React.ReactNode; 
  delay?: number;
  direction?: 'up' | 'down' | 'left' | 'right' | 'none';
  className?: string;
}) {
  const directions = {
    up: { y: 20 },
    down: { y: -20 },
    left: { x: 20 },
    right: { x: -20 },
    none: {}
  };

  return (
    <motion.div
      initial={{ opacity: 0, ...directions[direction] }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{ 
        duration: 0.5, 
        delay, 
        ease: [0.25, 0.1, 0.25, 1.0] // smooth custom cubic bezier
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
