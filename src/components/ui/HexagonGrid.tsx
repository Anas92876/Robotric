"use client";
import { useId } from "react";

interface HexagonGridProps {
  opacity?: number;
  color?: string;
  animate?: boolean;
  size?: number;
}

export const HexagonGrid: React.FC<HexagonGridProps> = ({
  opacity = 0.05,
  color = "currentColor",
  animate = false,
  size = 60,
}) => {
  const patternId = useId();
  const gradientId = useId();

  // Hexagon path (flat-top orientation)
  const hexagonPath = `M ${size / 2} 0 L ${size} ${size * 0.25} L ${size} ${size * 0.75} L ${size / 2} ${size} L 0 ${size * 0.75} L 0 ${size * 0.25} Z`;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ opacity }}>
      <svg
        className="absolute inset-0 w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern
            id={patternId}
            x="0"
            y="0"
            width={size * 1.5}
            height={size * 0.866}
            patternUnits="userSpaceOnUse"
          >
            {/* First hexagon */}
            <path
              d={hexagonPath}
              fill="none"
              stroke={color}
              strokeWidth="0.5"
            />

            {/* Offset hexagon for proper tiling */}
            <path
              d={hexagonPath}
              fill="none"
              stroke={color}
              strokeWidth="0.5"
              transform={`translate(${size * 0.75}, ${size * 0.433})`}
            />
          </pattern>

          {/* Gradient for fade effect */}
          <radialGradient id={gradientId} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={color} stopOpacity="0.8" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </radialGradient>
        </defs>

        <rect width="100%" height="100%" fill={`url(#${patternId})`} />

        {/* Animated highlighted hexagons using CSS (if animate is true) */}
        {animate && (
          <>
            <path
              d={hexagonPath}
              fill={`url(#${gradientId})`}
              stroke={color}
              strokeWidth="1.5"
              className="animate-pulse"
              style={{ 
                opacity: 0.2,
                transform: 'translate(15%, 20%)',
                transformOrigin: 'center'
              }}
            />
            <path
              d={hexagonPath}
              fill={`url(#${gradientId})`}
              stroke={color}
              strokeWidth="1.5"
              className="animate-pulse"
              style={{ 
                opacity: 0.2,
                transform: 'translate(70%, 60%)',
                transformOrigin: 'center',
                animationDelay: '2s'
              }}
            />
          </>
        )}
      </svg>
    </div>
  );
};
