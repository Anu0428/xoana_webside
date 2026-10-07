'use client';

import { motion, useAnimationFrame, useMotionTemplate, useMotionValue, useTransform } from 'framer-motion';
import { useRef } from 'react';
import { cn } from '@/lib/utils';

export function MagicCard({
  children,
  className,
  gradientColor = '#302311',
}: {
  children: React.ReactNode;
  className?: string;
  gradientColor?: string;
}) {
  const divRef = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!divRef.current) return;
    const { left, top } = divRef.current.getBoundingClientRect();
    mouseX.set(e.clientX - left);
    mouseY.set(e.clientY - top);
  }

  return (
    <div
      ref={divRef}
      onMouseMove={handleMouseMove}
      className={cn('group relative rounded-xl border border-white/10 bg-white dark:bg-zinc-900', className)}
    >
      <motion.div
        className="pointer-events-none absolute inset-0 rounded-xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: useMotionTemplate`radial-gradient(200px circle at ${mouseX}px ${mouseY}px, ${gradientColor}, transparent 80%)`,
        }}
      />
      {children}
    </div>
  );
}

export function Particles({
                            className,
                            quantity = 50,
                          }: {
  className?: string;
  quantity?: number;
}) {
  // Stable pseudo-random positions keep server/client markup and rerenders equal.
  const position = (index: number, seed: number) => {
    const value = Math.sin((index + 1) * (seed + 1) * 12.9898) * 43758.5453;
    return value - Math.floor(value);
  };

  return (
      <div className={cn('absolute inset-0 overflow-hidden', className)}>
        {Array.from({ length: quantity }).map((_, i) => (
            <motion.div
                key={i}
                className="absolute h-1 w-1 rounded-full bg-gold-500/25 dark:bg-gold-300/25"
                initial={{
                  x: position(i, 0) * 100 + '%',
                  y: position(i, 1) * 100 + '%',
                  opacity: position(i, 2) * 0.5 + 0.2,
                }}
                animate={{
                  y: [null, position(i, 3) * 100 + '%'],
                  x: [null, position(i, 4) * 100 + '%'],
                  opacity: [position(i, 2) * 0.5 + 0.2, position(i, 5) * 0.5 + 0.2],
                }}
                transition={{
                  duration: position(i, 6) * 10 + 10,
                  repeat: Infinity,
                  repeatType: 'reverse',
                }}
            />
        ))}
      </div>
  );
}

export function NumberTicker({
  value,
  direction = 'up',
  className,
  delay = 0,
}: {
  value: number;
  direction?: 'up' | 'down';
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const motionValue = useMotionValue(direction === 'down' ? value : 0);
  const springValue = useTransform(motionValue, (latest) => Intl.NumberFormat('en-US').format(Number(latest.toFixed(0))));

  useAnimationFrame(() => {
    if (!ref.current) return;
    ref.current.textContent = springValue.get();
  });

  return (
    <motion.span
      ref={ref}
      className={cn('tabular-nums', className)}
      onViewportEnter={() => {
        setTimeout(() => motionValue.set(direction === 'down' ? 0 : value), delay * 1000);
      }}
    />
  );
}
