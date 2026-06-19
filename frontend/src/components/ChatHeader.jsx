import { FiMoreVertical, FiPhone, FiVideo } from 'react-icons/fi';

export default function ChatHeader({ conversation, peer, online = false, onNewChat }) {
  const title = conversation?.name || peer?.username || 'Select a chat';
  const subtitle = conversation?.type === 'GROUP'
    ? `${conversation.participants?.length || 0} members`
    : online
      ? 'Online'
      : peer?.lastSeen
        ? `Last seen ${new Date(peer.lastSeen).toLocaleString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })}`
        : 'Offline';

  return (
    <header className="sticky top-0 z-20 border-b border-white/5 bg-wa-surface/90 px-4 py-3 backdrop-blur-xl">
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-wa-accent to-wa-accentDark text-lg font-semibold text-wa-surface shadow-soft">
            {conversation?.avatarUrl ? (
              <img src={conversation.avatarUrl} alt={title} className="h-full w-full object-cover" />
            ) : (
              title.slice(0, 2).toUpperCase()
            )}
          </div>

          <div className="min-w-0">
            <h1 className="truncate font-display text-lg font-semibold text-white">{title}</h1>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${online ? 'bg-wa-accent' : 'bg-slate-500'}`}>
                {online ? <span className="absolute inset-0 rounded-full bg-wa-accent/50 animate-ping" /> : null}
              </span>
              <span>{subtitle}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-slate-300">
          <button className="rounded-full p-2 transition hover:bg-white/5 hover:text-white" type="button" aria-label="Voice call">
            <FiPhone />
          </button>
          <button className="rounded-full p-2 transition hover:bg-white/5 hover:text-white" type="button" aria-label="Video call">
            <FiVideo />
          </button>
          <button
            onClick={onNewChat}
            className="rounded-full p-2 transition hover:bg-white/5 hover:text-white"
            type="button"
            aria-label="More options"
          >
            <FiMoreVertical />
          </button>
        </div>
      </div>
    </header>
  );
}
