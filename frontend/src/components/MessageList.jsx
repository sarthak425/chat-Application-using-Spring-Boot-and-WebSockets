import { AnimatePresence } from 'framer-motion';
import { FiArrowDownCircle } from 'react-icons/fi';
import EmptyState from './EmptyState';
import LoadingSkeleton from './LoadingSkeleton';
import MessageBubble from './MessageBubble';
import TypingIndicator from './TypingIndicator';

export default function MessageList({
  messages,
  isTyping,
  typingLabel,
  onCopyMessage,
  copiedMessageId,
  isAtBottom,
  onScrollToLatest,
  onStartNewChat,
  onScroll,
  scrollRef,
  isLoading = false
}) {
  return (
    <div ref={scrollRef} onScroll={onScroll} className="relative flex h-full flex-1 flex-col overflow-y-auto px-4 py-4 sm:px-6">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(37,211,102,0.08),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.03),transparent_24%)]" />

      <div className="relative z-10 flex min-h-full flex-1 flex-col justify-end gap-4">
        {isLoading ? (
          <div className="space-y-4">
            <LoadingSkeleton />
            <LoadingSkeleton />
            <LoadingSkeleton />
          </div>
        ) : messages.length ? (
          <AnimatePresence initial={false}>
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                isOwn={message.mine}
                onCopy={onCopyMessage}
                copied={copiedMessageId === message.id}
              />
            ))}
            {isTyping ? <TypingIndicator key="typing" label={typingLabel} /> : null}
          </AnimatePresence>
        ) : (
          <EmptyState onStartNewChat={onStartNewChat} />
        )}
      </div>

      {!isAtBottom ? (
        <button
          onClick={onScrollToLatest}
          type="button"
          className="fixed bottom-28 right-6 z-30 rounded-full bg-wa-accent p-4 text-2xl text-wa-surface shadow-soft transition hover:scale-105 hover:bg-wa-accentDark"
          aria-label="Scroll to latest"
        >
          <FiArrowDownCircle />
        </button>
      ) : null}
    </div>
  );
}
