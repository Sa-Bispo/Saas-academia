"use client";

// BorderTrail (ibelick, via 21st.dev): uma luz que percorre a borda do elemento pai.
// O pai precisa ser `relative` e ter border-radius; a máscara deixa a luz só na borda.
import type { CSSProperties } from "react";
import { motion, type Transition } from "framer-motion";

type BorderTrailProps = {
  className?: string;
  size?: number;
  transition?: Transition;
  delay?: number;
  onAnimationComplete?: () => void;
  style?: CSSProperties;
};

const BASE_TRANSITION: Transition = { repeat: Infinity, duration: 5, ease: "linear" };

export function BorderTrail({ className = "", size = 60, transition, delay, onAnimationComplete, style }: BorderTrailProps) {
  return (
    <div className="pointer-events-none absolute inset-0 rounded-[inherit] border border-transparent [mask-clip:padding-box,border-box] [mask-composite:intersect] [mask-image:linear-gradient(transparent,transparent),linear-gradient(#000,#000)]">
      <motion.div
        className={`absolute aspect-square bg-zinc-500 ${className}`}
        style={{ width: size, offsetPath: `rect(0 auto auto 0 round ${size}px)`, ...style }}
        animate={{ offsetDistance: ["0%", "100%"] }}
        transition={{ ...(transition ?? BASE_TRANSITION), delay }}
        onAnimationComplete={onAnimationComplete}
      />
    </div>
  );
}
