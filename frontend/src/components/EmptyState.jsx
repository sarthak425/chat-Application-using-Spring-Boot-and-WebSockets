import { motion } from 'framer-motion';
import { FiMessageCircle } from 'react-icons/fi';

export default function EmptyState({ onStartNewChat }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex h-full flex-col items-center justify-center px-6 text-center"
    >
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-wa-accent/10 text-3xl text-wa-accent shadow-soft">
        <FiMessageCircle />
      </div>
      <h2 className="mt-6 font-display text-3xl font-semibold text-white">Start a conversation</h2>
      <p className="mt-3 max-w-xl text-sm leading-6 text-slate-400">
        Pick someone from your contacts or use the New Chat button to begin a secure one-to-one chat.
      </p>
      <button
        onClick={onStartNewChat}
        type="button"
        className="mt-8 rounded-full bg-wa-accent px-5 py-3 text-sm font-semibold text-wa-surface transition hover:bg-wa-accentDark"
      >
        New conversation
      </button>
    </motion.div>
  );
}
