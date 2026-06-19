import { AnimatePresence, motion } from 'framer-motion';
import { FiSearch, FiX } from 'react-icons/fi';

export default function NewChatModal({
  open,
  contacts,
  searchQuery,
  onSearchQueryChange,
  onSelectContact,
  onClose,
  loading = false
}) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
        >
          <motion.div
            initial={{ y: 20, scale: 0.98 }}
            animate={{ y: 0, scale: 1 }}
            exit={{ y: 20, scale: 0.98 }}
            className="glass-card w-full max-w-2xl rounded-[2rem] p-5 shadow-soft"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-wa-accent">New chat</p>
                <h3 className="mt-1 font-display text-2xl font-semibold text-white">Choose a contact</h3>
              </div>
              <button type="button" onClick={onClose} className="rounded-full p-2 text-slate-300 hover:bg-white/5">
                <FiX />
              </button>
            </div>

            <div className="mt-4 flex items-center gap-3 rounded-2xl border border-white/5 bg-[#111b21] px-4 py-3 shadow-inner">
              <FiSearch className="text-slate-400" />
              <input
                value={searchQuery}
                onChange={(event) => onSearchQueryChange(event.target.value)}
                className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
                placeholder="Search users by name or email"
                type="search"
              />
            </div>

            <div className="mt-5 max-h-[50vh] overflow-y-auto pr-1">
              {loading ? (
                <div className="rounded-3xl border border-white/10 bg-white/5 px-4 py-6 text-sm text-slate-400">
                  Searching contacts...
                </div>
              ) : contacts.length ? (
                <div className="space-y-2">
                  {contacts.map((contact) => (
                    <button
                      key={contact.id}
                      type="button"
                      onClick={() => onSelectContact(contact)}
                      className="flex w-full items-center gap-3 rounded-3xl border border-white/5 bg-white/5 px-4 py-3 text-left transition hover:bg-white/10"
                    >
                      <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-wa-accent/15 text-sm font-semibold text-wa-accent">
                        {contact.profileImage ? (
                          <img src={contact.profileImage} alt={contact.username} className="h-full w-full object-cover" />
                        ) : (
                          contact.username.slice(0, 1).toUpperCase()
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-white">{contact.username}</p>
                        <p className="truncate text-sm text-slate-400">{contact.email}</p>
                      </div>
                      <div className={`h-2.5 w-2.5 rounded-full ${contact.onlineStatus ? 'bg-wa-accent' : 'bg-slate-500'}`} />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="rounded-3xl border border-dashed border-white/10 px-4 py-6 text-sm text-slate-400">
                  No users found.
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
