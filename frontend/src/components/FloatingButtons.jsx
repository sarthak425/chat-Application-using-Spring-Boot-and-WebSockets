import { motion } from 'framer-motion';
import { FiPlus, FiArrowDownCircle } from 'react-icons/fi';

export default function FloatingButtons({ onScrollToLatest, onStartNewChat, isAtBottom }) {
  return (
    <div className="pointer-events-none">
      <div className="fixed bottom-6 right-6 z-40 flex flex-col gap-3 pointer-events-auto">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.96 }}
          onClick={onStartNewChat}
          type="button"
          className="flex h-12 w-12 items-center justify-center rounded-full bg-white/6 text-white shadow-soft transition hover:bg-wa-accent hover:text-wa-surface"
          aria-label="New chat"
        >
          <FiPlus />
        </motion.button>

        {!isAtBottom ? (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.96 }}
            onClick={onScrollToLatest}
            type="button"
            className="flex h-12 w-12 items-center justify-center rounded-full bg-wa-accent text-wa-surface shadow-soft transition hover:scale-105 hover:bg-wa-accentDark"
            aria-label="Scroll to latest"
          >
            <FiArrowDownCircle />
          </motion.button>
        ) : null}
      </div>
    </div>
  );
}
