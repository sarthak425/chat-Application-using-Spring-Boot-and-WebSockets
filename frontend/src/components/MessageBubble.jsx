import { motion } from 'framer-motion';
import { FaRobot } from 'react-icons/fa6';
import { FiCopy, FiCheck } from 'react-icons/fi';

export default function MessageBubble({
  message,
  isOwn = false,
  onCopy,
  copied = false
}) {
  if (message.type === 'SYSTEM') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8 }}
        className="flex justify-center"
      >
        <div className="max-w-[80%] rounded-full border border-white/5 bg-white/5 px-4 py-2 text-center text-xs text-slate-400">
          {message.content}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 12, scale: 0.98 }}
      className={`group flex max-w-[84%] gap-3 ${isOwn ? 'ml-auto flex-row-reverse' : ''}`}
    >
      {!isOwn ? (
        <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-wa-accent to-wa-accentDark text-white shadow-soft">
          <FaRobot />
        </div>
      ) : (
        <div className="h-10 w-10 shrink-0" />
      )}

      <div
        className={[
          'relative rounded-3xl px-4 py-3 shadow-soft transition',
          isOwn
            ? 'bg-wa-accent text-white rounded-br-md'
            : 'bg-[#202c33] text-white rounded-bl-md'
        ].join(' ')}
      >
        <button
          onClick={() => onCopy(message.id, message.content)}
          type="button"
          className="absolute right-2 top-2 rounded-full bg-black/20 p-2 text-white/80 opacity-0 transition hover:bg-black/30 group-hover:opacity-100"
          aria-label="Copy message"
        >
          {copied ? <FiCheck /> : <FiCopy />}
        </button>

        <p className="whitespace-pre-wrap break-words pr-8 text-[15px] leading-relaxed">
          {message.content}
        </p>

        <div className={`mt-2 flex items-center justify-end gap-1 text-[11px] ${isOwn ? 'text-white/80' : 'text-slate-400'}`}>
          <span>{new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      </div>
    </motion.div>
  );
}
