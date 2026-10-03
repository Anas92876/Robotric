import React from 'react';

interface WaveDividerProps {
  variant?: 'wave1' | 'wave2' | 'wave3';
  flip?: boolean;
  className?: string;
  color?: string;
}

export const WaveDivider: React.FC<WaveDividerProps> = ({
  variant = 'wave1',
  flip = false,
  className = '',
  color = 'currentColor'
}) => {
  const waves = {
    wave1: (
      <path d="M0,32L48,37.3C96,43,192,53,288,58.7C384,64,480,64,576,58.7C672,53,768,43,864,48C960,53,1056,75,1152,80C1248,85,1344,75,1392,69.3L1440,64L1440,0L1392,0C1344,0,1248,0,1152,0C1056,0,960,0,864,0C768,0,672,0,576,0C480,0,384,0,288,0C192,0,96,0,48,0L0,0Z" />
    ),
    wave2: (
      <path d="M0,64L48,58.7C96,53,192,43,288,48C384,53,480,75,576,80C672,85,768,75,864,64C960,53,1056,43,1152,48C1248,53,1344,75,1392,85.3L1440,96L1440,0L1392,0C1344,0,1248,0,1152,0C1056,0,960,0,864,0C768,0,672,0,576,0C480,0,384,0,288,0C192,0,96,0,48,0L0,0Z" />
    ),
    wave3: (
      <path d="M0,96L48,85.3C96,75,192,53,288,42.7C384,32,480,32,576,42.7C672,53,768,75,864,74.7C960,75,1056,53,1152,48C1248,43,1344,53,1392,58.7L1440,64L1440,0L1392,0C1344,0,1248,0,1152,0C1056,0,960,0,864,0C768,0,672,0,576,0C480,0,384,0,288,0C192,0,96,0,48,0L0,0Z" />
    )
  };

  return (
    <div className={`w-full overflow-hidden leading-none ${className}`} style={{ transform: flip ? 'rotate(180deg)' : 'none' }}>
      <svg
        className="relative block w-full h-[60px] md:h-[80px]"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 1440 96"
        preserveAspectRatio="none"
        fill={color}
      >
        {waves[variant]}
      </svg>
    </div>
  );
};
