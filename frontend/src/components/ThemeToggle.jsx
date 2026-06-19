import { FiMoon, FiSun } from 'react-icons/fi';
import { useTheme } from '../context/ThemeContext';

export default function ThemeToggle() {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-white transition hover:bg-white/10"
      aria-label="Toggle theme"
    >
      {isDark ? <FiSun /> : <FiMoon />}
      <span>{isDark ? 'Light' : 'Dark'}</span>
    </button>
  );
}
