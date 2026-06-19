import { motion } from 'framer-motion';

export default function TypingIndicator({ label = 'Someone is typing' }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      className="flex max-w-[84%] gap-3"
    >
      <div className="rounded-3xl rounded-bl-md border border-white/5 bg-[#202c33] px-4 py-3 shadow-soft">
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-300">{label}</span>
          <span className="flex gap-1">
            <span className="h-2 w-2 animate-bounce rounded-full bg-wa-accent [animation-delay:-0.2s]" />
            <span className="h-2 w-2 animate-bounce rounded-full bg-wa-accent [animation-delay:-0.1s]" />
            <span className="h-2 w-2 animate-bounce rounded-full bg-wa-accent" />
          </span>
        </div>
      </div>
    </motion.div>
  );
}
