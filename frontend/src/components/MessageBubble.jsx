import { motion } from 'framer-motion';
import { FiCheck, FiCopy } from 'react-icons/fi';
import { MdDone, MdDoneAll } from 'react-icons/md';

function StatusIcon({ status }) {
  if (status === 'READ') {
    return <MdDoneAll className="text-sky-400" />;
  }

  if (status === 'DELIVERED') {
    return <MdDoneAll className="text-slate-300" />;
  }

  return <MdDone className="text-slate-300" />;
}

export default function MessageBubble({ message, isOwn = false, onCopy, copied = false }) {
  const time = message.timestamp
    ? new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '';

  const mediaBlock = message.fileUrl ? (
    message.messageType === 'IMAGE' ? (
      <img src={message.fileUrl} alt="Attachment" className="mb-3 max-h-80 rounded-2xl object-cover" />
    ) : message.messageType === 'AUDIO' ? (
      <audio className="mb-3 w-full" controls src={message.fileUrl} />
    ) : (
      <a href={message.fileUrl} target="_blank" rel="noreferrer" className="mb-3 block rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-wa-accent">
        Attachment
      </a>
    )
  ) : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 12, scale: 0.98 }}
      className={`group flex max-w-[84%] gap-3 ${isOwn ? 'ml-auto flex-row-reverse' : ''}`}
    >
      <div
        className={[
          'relative rounded-3xl px-4 py-3 shadow-soft transition',
          isOwn ? 'rounded-br-md bg-wa-accent text-white' : 'rounded-bl-md bg-[#202c33] text-white'
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

        {mediaBlock}

        {message.content ? (
          <p className="whitespace-pre-wrap break-words pr-8 text-[15px] leading-relaxed">
            {message.deleted ? 'This message was deleted' : message.content}
          </p>
        ) : null}

        <div className={`mt-2 flex items-center justify-end gap-1 text-[11px] ${isOwn ? 'text-white/80' : 'text-slate-400'}`}>
          <span>{time}</span>
          {isOwn ? <StatusIcon status={message.status} /> : null}
        </div>
      </div>
    </motion.div>
  );
}
