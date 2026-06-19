import { motion } from 'framer-motion';

export default function ConversationItem({
  conversation,
  active = false,
  onClick,
  currentUserId
}) {
  const peer = conversation.participants?.find((participant) => participant.id !== currentUserId);
  const initials = (conversation.name || peer?.username || 'Chat')
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
  const time = conversation.lastMessageAt
    ? new Date(conversation.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '';

  return (
    <motion.button
      whileHover={{ x: 4 }}
      whileTap={{ scale: 0.99 }}
      onClick={onClick}
      type="button"
      className={[
        'group flex w-full items-start gap-3 rounded-3xl px-3 py-3 text-left transition',
        active ? 'bg-white/10 shadow-soft' : 'hover:bg-white/5'
      ].join(' ')}
    >
      <div className="relative mt-0.5 flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-wa-accent to-wa-accentDark text-sm font-semibold text-wa-surface ring-1 ring-white/5">
        {conversation.avatarUrl ? (
          <img src={conversation.avatarUrl} alt={conversation.name} className="h-full w-full object-cover" />
        ) : (
          initials || 'CH'
        )}
        <span
          className={[
            'absolute bottom-0.5 right-0.5 h-3 w-3 rounded-full ring-2 ring-wa-panel',
            peer?.onlineStatus ? 'bg-wa-accent' : 'bg-slate-500'
          ].join(' ')}
        />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <h3 className="truncate font-medium text-white">{conversation.name || peer?.username || 'Chat'}</h3>
          <span className="shrink-0 text-[11px] text-slate-400">{time}</span>
        </div>

        <div className="mt-1 flex items-center justify-between gap-3">
          <p className="truncate text-sm text-slate-400">{conversation.lastMessagePreview || 'No messages yet'}</p>
          {conversation.unreadCount ? (
            <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-wa-accent px-2 py-0.5 text-[11px] font-semibold text-wa-surface">
              {conversation.unreadCount}
            </span>
          ) : null}
        </div>
      </div>
    </motion.button>
  );
}
