import { motion } from 'framer-motion';
import { FaRobot } from 'react-icons/fa6';

export default function EmptyState({ onStartNewChat }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex h-full flex-col items-center justify-center px-6 text-center"
    >
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-wa-accent/10 text-3xl text-wa-accent shadow-soft">
        <FaRobot />
      </div>
      <h2 className="mt-6 font-display text-3xl font-semibold text-white">Start a conversation</h2>
      <p className="mt-3 max-w-xl text-sm leading-6 text-slate-400">
        Your chat stays private in this browser. Create a new conversation on the left and start talking to AI Assistant.
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
