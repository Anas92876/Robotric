import { useEffect, useRef, useState } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  opacity: number;
  color: string;
  pulsePhase: number;
}

interface ParticleFieldProps {
  density?: number; // particles per 10000 pixels
  maxConnectDistance?: number;
  colors?: string[];
  className?: string;
  patternType?: 'default' | 'circuit' | 'grid' | 'wave';
}

export default function ParticleField({
  density = 0.15,
  maxConnectDistance = 150,
  colors = ['#06b6d4', '#3b82f6', '#8b5cf6'], // cyan, blue, purple
  className = '',
  patternType = 'default',
}: ParticleFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationFrameRef = useRef<number>();
  const mouseRef = useRef({ x: 0, y: 0, isActive: false });
  const [isLowPerformance, setIsLowPerformance] = useState(false);

  // Detect slow connection or device
  useEffect(() => {
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    const isSlowConnection = connection?.effectiveType === 'slow-2g' || connection?.effectiveType === '2g';
    const isLowEndDevice = navigator.hardwareConcurrency ? navigator.hardwareConcurrency < 4 : false;

    setIsLowPerformance(isSlowConnection || isLowEndDevice);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    // Set canvas size
    const resizeCanvas = () => {
      const dpr = isLowPerformance ? 1 : Math.min(window.devicePixelRatio, 2);
      canvas.width = canvas.offsetWidth * dpr;
      canvas.height = canvas.offsetHeight * dpr;
      ctx.scale(dpr, dpr);
      initParticles();
    };

    // Initialize particles
    const initParticles = () => {
      const area = (canvas.offsetWidth * canvas.offsetHeight) / 10000;
      const particleCount = Math.floor(area * density * (isLowPerformance ? 0.5 : 1));
      particlesRef.current = [];

      for (let i = 0; i < particleCount; i++) {
        particlesRef.current.push(createParticle());
      }
    };

    // Create a single particle
    const createParticle = (): Particle => {
      const speed = isLowPerformance ? 0.2 : 0.3;
      return {
        x: Math.random() * canvas.offsetWidth,
        y: Math.random() * canvas.offsetHeight,
        vx: (Math.random() - 0.5) * speed,
        vy: (Math.random() - 0.5) * speed,
        radius: Math.random() * 2 + 1,
        opacity: Math.random() * 0.5 + 0.3,
        color: colors[Math.floor(Math.random() * colors.length)],
        pulsePhase: Math.random() * Math.PI * 2,
      };
    };

    // Mouse interaction
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        isActive: true,
      };
    };

    const handleMouseLeave = () => {
      mouseRef.current.isActive = false;
    };

    // Draw circuit pattern
    const drawCircuitPattern = (p1: Particle, p2: Particle, distance: number) => {
      const opacity = (1 - distance / maxConnectDistance) * 0.3;

      // Draw right-angle connections (circuit board style)
      ctx.strokeStyle = `rgba(6, 182, 212, ${opacity})`;
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    };

    // Draw grid pattern
    const drawGridPattern = (p1: Particle, p2: Particle, distance: number) => {
      const opacity = (1 - distance / maxConnectDistance) * 0.2;
      const midX = (p1.x + p2.x) / 2;
      const midY = (p1.y + p2.y) / 2;

      // Draw with nodes at midpoint
      ctx.strokeStyle = `rgba(59, 130, 246, ${opacity})`;
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(midX, midY);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();

      // Draw small node
      ctx.fillStyle = `rgba(139, 92, 246, ${opacity * 2})`;
      ctx.beginPath();
      ctx.arc(midX, midY, 1, 0, Math.PI * 2);
      ctx.fill();
    };

    // Animation loop
    const animate = (timestamp: number) => {
      ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);

      const particles = particlesRef.current;

      // Update and draw particles
      particles.forEach((particle, i) => {
        // Update position
        particle.x += particle.vx;
        particle.y += particle.vy;

        // Bounce off edges
        if (particle.x < 0 || particle.x > canvas.offsetWidth) particle.vx *= -1;
        if (particle.y < 0 || particle.y > canvas.offsetHeight) particle.vy *= -1;

        // Keep within bounds
        particle.x = Math.max(0, Math.min(canvas.offsetWidth, particle.x));
        particle.y = Math.max(0, Math.min(canvas.offsetHeight, particle.y));

        // Mouse interaction - repel particles
        if (mouseRef.current.isActive && !isLowPerformance) {
          const dx = particle.x - mouseRef.current.x;
          const dy = particle.y - mouseRef.current.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 100) {
            const force = (100 - distance) / 100;
            particle.vx += (dx / distance) * force * 0.5;
            particle.vy += (dy / distance) * force * 0.5;
          }
        }

        // Pulse effect
        particle.pulsePhase += 0.02;
        const pulse = Math.sin(particle.pulsePhase) * 0.3 + 0.7;

        // Draw particle
        ctx.fillStyle = particle.color;
        ctx.globalAlpha = particle.opacity * pulse;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        ctx.fill();

        // Draw connections (only check ahead to avoid duplicates)
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = particle.x - p2.x;
          const dy = particle.y - p2.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < maxConnectDistance) {
            ctx.globalAlpha = 1;

            switch (patternType) {
              case 'circuit':
                drawCircuitPattern(particle, p2, distance);
                break;
              case 'grid':
                drawGridPattern(particle, p2, distance);
                break;
              case 'wave':
                // Wave pattern with sine curves
                const opacity = (1 - distance / maxConnectDistance) * 0.2;
                ctx.strokeStyle = `rgba(139, 92, 246, ${opacity})`;
                ctx.lineWidth = 0.5;
                ctx.beginPath();
                ctx.moveTo(particle.x, particle.y);

                const cpX = (particle.x + p2.x) / 2 + Math.sin(timestamp * 0.001) * 20;
                const cpY = (particle.y + p2.y) / 2 + Math.cos(timestamp * 0.001) * 20;
                ctx.quadraticCurveTo(cpX, cpY, p2.x, p2.y);
                ctx.stroke();
                break;
              default:
                // Default straight lines
                const defaultOpacity = (1 - distance / maxConnectDistance) * 0.15;
                ctx.strokeStyle = `rgba(100, 200, 255, ${defaultOpacity})`;
                ctx.lineWidth = 0.5;
                ctx.beginPath();
                ctx.moveTo(particle.x, particle.y);
                ctx.lineTo(p2.x, p2.y);
                ctx.stroke();
            }
          }
        }
      });

      ctx.globalAlpha = 1;
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    // Initialize
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', handleMouseLeave);

    // Start animation
    animationFrameRef.current = requestAnimationFrame(animate);

    // Cleanup
    return () => {
      window.removeEventListener('resize', resizeCanvas);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [density, maxConnectDistance, colors, patternType, isLowPerformance]);

  return (
    <canvas
      ref={canvasRef}
      className={`fixed inset-0 -z-10 pointer-events-none ${className}`}
      style={{ width: '100%', height: '100%' }}
    />
  );
}
