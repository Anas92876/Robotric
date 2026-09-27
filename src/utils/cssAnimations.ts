/**
 * CSS animation utilities to replace simple Framer Motion animations
 * This reduces JavaScript bundle size and improves performance
 */

export const fadeInUp = {
  animation: 'fadeInUp 0.5s ease-out forwards',
  opacity: 0,
};

export const fadeIn = {
  animation: 'fadeIn 0.5s ease-out forwards',
  opacity: 0,
};

export const scaleIn = {
  animation: 'scaleIn 0.5s ease-out forwards',
  opacity: 0,
  transform: 'scale(0.95)',
};

// CSS keyframes (add to global CSS)
export const keyframesCSS = `
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes scaleIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
`;
