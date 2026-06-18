import { motion } from 'framer-motion';
import { FaRobot } from 'react-icons/fa6';

export default function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      className="flex max-w-[84%] gap-3"
    >
      <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-wa-accent to-wa-accentDark text-white shadow-soft">
        <FaRobot />
      </div>

      <div className="rounded-3xl rounded-bl-md border border-white/5 bg-[#202c33] px-4 py-3 shadow-soft">
        <div className="space-y-2">
          <div className="h-2 w-32 animate-pulse rounded-full bg-white/8" />
          <div className="h-2 w-24 animate-pulse rounded-full bg-white/8 [animation-delay:120ms]" />
          <div className="flex items-center gap-2 pt-1">
            <span className="text-sm text-slate-300">AI Assistant is typing</span>
            <span className="flex gap-1">
              <span className="h-2 w-2 animate-bounce rounded-full bg-wa-accent [animation-delay:-0.2s]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-wa-accent [animation-delay:-0.1s]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-wa-accent" />
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
