"use client";
import { useId } from "react";

interface CircuitPatternProps {
  opacity?: number;
  color?: string;
  animate?: boolean;
}

export const CircuitPattern: React.FC<CircuitPatternProps> = ({
  opacity = 0.03,
  color = "currentColor",
  animate = false,
}) => {
  const patternId = useId();

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ opacity }}>
      <svg
        className="absolute inset-0 w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <defs>
          <pattern
            id={patternId}
            x="0"
            y="0"
            width="100"
            height="100"
            patternUnits="userSpaceOnUse"
          >
            {/* Horizontal lines */}
            <line x1="0" y1="20" x2="40" y2="20" stroke={color} strokeWidth="0.5" />
            <line x1="60" y1="20" x2="100" y2="20" stroke={color} strokeWidth="0.5" />

            {/* Vertical lines */}
            <line x1="20" y1="0" x2="20" y2="40" stroke={color} strokeWidth="0.5" />
            <line x1="20" y1="60" x2="20" y2="100" stroke={color} strokeWidth="0.5" />

            {/* Diagonal connections */}
            <line x1="80" y1="0" x2="80" y2="30" stroke={color} strokeWidth="0.5" />
            <line x1="80" y1="30" x2="100" y2="30" stroke={color} strokeWidth="0.5" />

            {/* Circuit nodes (small circles) */}
            <circle cx="20" cy="20" r="2" fill={color} />
            <circle cx="80" cy="30" r="2" fill={color} />
            <circle cx="40" cy="70" r="1.5" fill={color} />
            <circle cx="60" cy="50" r="1.5" fill={color} />

            {/* Small rectangles (resistors/components) */}
            <rect x="38" y="18" width="4" height="4" fill="none" stroke={color} strokeWidth="0.5" />
            <rect x="58" y="18" width="4" height="4" fill="none" stroke={color} strokeWidth="0.5" />
            <rect x="18" y="58" width="4" height="4" fill="none" stroke={color} strokeWidth="0.5" />

            {/* More lines creating circuit paths */}
            <line x1="40" y1="70" x2="60" y2="70" stroke={color} strokeWidth="0.5" />
            <line x1="60" y1="50" x2="60" y2="70" stroke={color} strokeWidth="0.5" />
          </pattern>
        </defs>

        <rect width="100%" height="100%" fill={`url(#${patternId})`} />

        {/* Animated glowing nodes using CSS (if animate is true) */}
        {animate && (
          <>
            <circle
              cx="20%"
              cy="20%"
              r="3"
              fill={color}
              className="animate-pulse"
              style={{ opacity: 0.5 }}
            />
            <circle
              cx="80%"
              cy="70%"
              r="3"
              fill={color}
              className="animate-pulse"
              style={{ opacity: 0.5, animationDelay: '1.5s' }}
            />
          </>
        )}
      </svg>
    </div>
  );
};
