import { motion } from 'framer-motion';

export default function ConversationItem({
  conversation,
  active = false,
  onClick,
  isTyping = false
}) {
  const lastMessage = conversation.messages[conversation.messages.length - 1];
  const preview = lastMessage ? lastMessage.content : 'No messages yet';
  const time = lastMessage?.timestamp
    ? new Date(lastMessage.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '';

  return (
    <motion.button
      whileHover={{ x: 4 }}
      whileTap={{ scale: 0.99 }}
      onClick={onClick}
      type="button"
      className={[
        'group flex w-full items-start gap-3 rounded-2xl px-3 py-3 text-left transition',
        active ? 'bg-white/10 shadow-soft' : 'hover:bg-white/5'
      ].join(' ')}
    >
      <div className="relative mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-white/15 to-white/5 text-sm font-semibold text-white ring-1 ring-white/5">
        {conversation.title
          .split(' ')
          .slice(0, 2)
          .map((part) => part[0])
          .join('')
          .toUpperCase() || 'CH'}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <h3 className="truncate font-medium text-white">{conversation.title}</h3>
          <span className="shrink-0 text-[11px] text-slate-400">{time}</span>
        </div>

        <div className="mt-1 flex items-center justify-between gap-3">
          <p className="truncate text-sm text-slate-400">
            {isTyping ? 'Typing...' : preview}
          </p>
          {isTyping ? (
            <span className="shrink-0 rounded-full bg-wa-accent/20 px-2 py-0.5 text-[10px] font-medium text-wa-accent">
              online
            </span>
          ) : null}
        </div>
      </div>
    </motion.button>
  );
}
