import { motion } from 'framer-motion';
import { FiLogOut, FiPlus, FiSearch } from 'react-icons/fi';
import ConversationItem from './ConversationItem';
import ThemeToggle from './ThemeToggle';

export default function Sidebar({
  conversations,
  activeConversationId,
  searchQuery,
  onSearchQueryChange,
  onCreateConversation,
  onSelectConversation,
  profile,
  onLogout,
  connectionStatus,
  currentUserId,
  isLoading = false
}) {
  return (
    <aside className="flex h-full flex-col border-r border-white/5 bg-wa-panel/90 backdrop-blur-xl">
      <div className="border-b border-white/5 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.32em] text-wa-accent">ChatBox</p>
            <h2 className="mt-1 font-display text-2xl font-semibold text-white">Chats</h2>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.96 }}
              onClick={onCreateConversation}
              type="button"
              className="flex h-11 w-11 items-center justify-center rounded-2xl bg-wa-accent text-wa-surface shadow-soft transition hover:bg-wa-accentDark"
              aria-label="New chat"
            >
              <FiPlus />
            </motion.button>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3 rounded-2xl border border-white/5 bg-[#111b21] px-4 py-3 shadow-inner">
          <FiSearch className="text-slate-400" />
          <input
            value={searchQuery}
            onChange={(event) => onSearchQueryChange(event.target.value)}
            className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
            placeholder="Search chats"
            type="search"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3">
        <div className="mb-3 flex items-center justify-between px-1 text-[11px] uppercase tracking-[0.25em] text-slate-500">
          <span>Recent</span>
          <span>{conversations.length}</span>
        </div>

        <div className="space-y-2">
          {isLoading ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-5 text-sm text-slate-400">
              Loading chats...
            </div>
          ) : conversations.length ? (
            conversations.map((conversation) => (
              <ConversationItem
                key={conversation.id}
                conversation={conversation}
                active={conversation.id === activeConversationId}
                currentUserId={currentUserId}
                onClick={() => onSelectConversation(conversation.id)}
              />
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-white/10 px-4 py-6 text-sm text-slate-400">
              Start a new chat from the button above.
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-white/5 p-4">
        <div className="rounded-3xl border border-white/5 bg-[#111b21] p-4 shadow-soft">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-wa-accent/20 text-lg font-semibold text-wa-accent">
              {profile?.profileImage ? (
                <img src={profile.profileImage} alt={profile.username} className="h-full w-full object-cover" />
              ) : (
                (profile?.username || 'U').slice(0, 1).toUpperCase()
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-white">{profile?.username || 'User'}</p>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span className={`h-2 w-2 rounded-full ${connectionStatus === 'online' ? 'bg-wa-accent' : 'bg-slate-500'}`} />
                <span>{connectionStatus === 'online' ? 'Connected' : 'Offline'}</span>
              </div>
            </div>

            <button
              onClick={onLogout}
              type="button"
              className="rounded-full p-2 text-slate-400 transition hover:bg-white/5 hover:text-white"
              aria-label="Logout"
            >
              <FiLogOut />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
