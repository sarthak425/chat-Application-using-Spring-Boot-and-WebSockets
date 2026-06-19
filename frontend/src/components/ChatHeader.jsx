import { FaRobot } from 'react-icons/fa6';
import { FiMoreVertical, FiPhone, FiVideo } from 'react-icons/fi';

export default function ChatHeader({ botName = 'AI Assistant', online = true }) {
  return (
    <header className="sticky top-0 z-20 border-b border-white/5 bg-wa-surface/90 px-4 py-3 backdrop-blur-xl">
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-wa-accent to-wa-accentDark text-lg text-white shadow-soft">
            <FaRobot />
          </div>

          <div className="min-w-0">
            <h1 className="truncate font-display text-lg font-semibold text-white">{botName}</h1>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${online ? 'bg-wa-accent' : 'bg-slate-500'}`}>
                {online ? <span className="absolute inset-0 rounded-full bg-wa-accent/50 animate-ping" /> : null}
              </span>
              <span>{online ? 'Online' : 'Offline'}</span>
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
          <button className="rounded-full p-2 transition hover:bg-white/5 hover:text-white" type="button" aria-label="More options">
            <FiMoreVertical />
          </button>
        </div>
      </div>
    </header>
  );
}
