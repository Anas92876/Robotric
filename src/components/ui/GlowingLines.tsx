"use client";
import { motion } from "framer-motion";
import { useId, useMemo } from "react";

interface GlowingLinesProps {
  opacity?: number;
  color?: string;
  count?: number;
}

export const GlowingLines: React.FC<GlowingLinesProps> = ({
  opacity = 0.1,
  color = "#0ea5e9", // primary color
  count = 5,
}) => {
  const glowId = useId();
  const gradientId = useId();

  // Generate random lines with start and end points
  const lines = useMemo(() => Array.from({ length: count }, (_, i) => ({
    id: i,
    x1: `${Math.random() * 100}%`,
    y1: `${Math.random() * 100}%`,
    x2: `${Math.random() * 100}%`,
    y2: `${Math.random() * 100}%`,
    delay: i * 0.5,
  })), [count]);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ opacity }}>
      <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
        <defs>
          {/* Glow filter */}
          <filter id={glowId}>
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Animated gradient for flowing effect */}
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={color} stopOpacity="0" />
            <stop offset="50%" stopColor={color} stopOpacity="1" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>

        {lines.map((line) => (
          <g key={line.id}>
            {/* Static line */}
            <line
              x1={line.x1}
              y1={line.y1}
              x2={line.x2}
              y2={line.y2}
              stroke={color}
              strokeWidth="1"
              opacity="0.3"
            />

            {/* Animated flowing effect */}
            <motion.line
              x1={line.x1}
              y1={line.y1}
              x2={line.x2}
              y2={line.y2}
              stroke={`url(#${gradientId})`}
              strokeWidth="2"
              filter={`url(#${glowId})`}
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{
                pathLength: [0, 1, 0],
                opacity: [0, 0.8, 0],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "linear",
                delay: line.delay,
              }}
            />

            {/* Glowing dots at endpoints */}
            <motion.circle
              cx={line.x1}
              cy={line.y1}
              r="3"
              fill={color}
              filter={`url(#${glowId})`}
              initial={{ opacity: 0.3 }}
              animate={{
                opacity: [0.3, 0.8, 0.3],
                scale: [1, 1.3, 1],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
                delay: line.delay,
              }}
            />
          </g>
        ))}
      </svg>
    </div>
  );
};
