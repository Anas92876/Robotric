"use client";
interface TechGridProps {
  opacity?: number;
  color?: string;
}

/**
 * Simple tech grid pattern - lightweight CSS-based solution
 */
export const TechGrid: React.FC<TechGridProps> = ({
  opacity = 0.03,
  color = "currentColor",
}) => {
  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{
        opacity,
        backgroundImage: `
          linear-gradient(${color} 1px, transparent 1px),
          linear-gradient(90deg, ${color} 1px, transparent 1px)
        `,
        backgroundSize: "50px 50px",
      }}
    />
  );
};
