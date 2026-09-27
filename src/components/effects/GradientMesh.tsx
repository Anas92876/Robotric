import { motion } from 'framer-motion';

/**
 * Premium Gradient Mesh Background
 * Animated gradient blobs for visual depth
 */
export default function GradientMesh() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      {/* Primary Blob - Top Right (Dark Green) */}
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.15, 0.25, 0.15],
          x: [0, 50, 0],
          y: [0, -30, 0],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute -top-40 -right-40 w-[500px] h-[500px] md:w-[800px] md:h-[800px]
                   bg-gradient-to-br from-[#003300]/20 via-[#cccc99]/10 to-transparent
                   rounded-full blur-3xl"
      />

      {/* Secondary Blob - Bottom Left (Sage Green) */}
      <motion.div
        animate={{
          scale: [1, 1.3, 1],
          opacity: [0.1, 0.2, 0.1],
          x: [0, -40, 0],
          y: [0, 40, 0],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 2,
        }}
        className="absolute -bottom-40 -left-40 w-[600px] h-[600px] md:w-[900px] md:h-[900px]
                   bg-gradient-to-tr from-[#cccc99]/15 via-[#003300]/10 to-transparent
                   rounded-full blur-3xl"
      />

      {/* Accent Blob - Center (Rotating) */}
      <motion.div
        animate={{
          scale: [1, 1.1, 1],
          opacity: [0.08, 0.15, 0.08],
          rotate: [0, 180, 360],
        }}
        transition={{
          duration: 30,
          repeat: Infinity,
          ease: "linear",
        }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
                   w-[700px] h-[700px] md:w-[1000px] md:h-[1000px]
                   bg-gradient-to-br from-[#003300]/15 via-transparent to-[#cccc99]/10
                   rounded-full blur-3xl"
      />

      {/* Small Accent Blob - Top Middle */}
      <motion.div
        animate={{
          opacity: [0.1, 0.2, 0.1],
          scale: [1, 1.2, 1],
          x: [0, 30, 0],
        }}
        transition={{
          duration: 15,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 5,
        }}
        className="absolute top-1/4 right-1/4 w-[300px] h-[300px] md:w-[400px] md:h-[400px]
                   bg-gradient-to-bl from-[#003300]/20 to-transparent
                   rounded-full blur-3xl"
      />

      {/* Small Accent Blob - Bottom Right */}
      <motion.div
        animate={{
          opacity: [0.08, 0.18, 0.08],
          scale: [1, 1.15, 1],
          y: [0, -20, 0],
        }}
        transition={{
          duration: 18,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 8,
        }}
        className="absolute bottom-1/4 left-1/4 w-[350px] h-[350px] md:w-[450px] md:h-[450px]
                   bg-gradient-to-tr from-[#cccc99]/15 to-transparent
                   rounded-full blur-3xl"
      />

      {/* Grid Pattern Overlay for Modern Look */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `
            linear-gradient(to right, #003300 1px, transparent 1px),
            linear-gradient(to bottom, #003300 1px, transparent 1px)
          `,
          backgroundSize: '80px 80px',
        }}
      />

      {/* Noise Texture Overlay for Depth */}
      <div
        className="absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' /%3E%3C/svg%3E")`,
        }}
      />
    </div>
  );
}
