import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../providers/ThemeProvider';
import { motion } from 'framer-motion';

export function ThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme();

  const handleToggle = () => {
    const newTheme = resolvedTheme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
  };

  return (
    <button
      onClick={handleToggle}
      className="relative p-3 rounded-lg bg-[#cccc99]/20 dark:bg-[#0d1a0d] hover:bg-[#cccc99]/30 dark:hover:bg-[#1a331a] border border-[#003300]/20 hover:border-[#003300]/50 transition-all duration-300 cursor-pointer"
      aria-label="Toggle theme"
      type="button"
    >
      <motion.div
        initial={false}
        animate={{ rotate: resolvedTheme === 'dark' ? 0 : 180 }}
        transition={{ duration: 0.3 }}
      >
        {resolvedTheme === 'dark' ? (
          <Sun className="w-5 h-5 text-[#003300] dark:text-[#ffffcc]" />
        ) : (
          <Moon className="w-5 h-5 text-[#003300]" />
        )}
      </motion.div>
    </button>
  );
}
