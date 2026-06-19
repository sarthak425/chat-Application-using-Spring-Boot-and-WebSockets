import { AnimatePresence } from 'framer-motion';
import { FiArrowDownCircle } from 'react-icons/fi';
import MessageBubble from './MessageBubble';
import TypingIndicator from './TypingIndicator';
import EmptyState from './EmptyState';
import LoadingSkeleton from './LoadingSkeleton';
import FloatingButtons from './FloatingButtons';

export default function MessageList({
  conversation,
  isTyping,
  currentUserName = '',
  onCopyMessage,
  copiedMessageId,
  isAtBottom,
  onScrollToLatest,
  onStartNewChat,
  onScroll,
  scrollRef
}) {
  const messages = conversation?.messages || [];
  const lastMessage = messages[messages.length - 1];
  const showSkeleton = Boolean(lastMessage && lastMessage.pending && lastMessage.type === 'BOT');

  return (
    <div ref={scrollRef} onScroll={onScroll} className="relative flex h-full flex-1 flex-col overflow-y-auto px-4 py-4 sm:px-6">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(37,211,102,0.08),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.03),transparent_24%)]" />

      <div className="relative z-10 flex min-h-full flex-1 flex-col justify-end gap-4">
        {messages.length ? (
          <AnimatePresence initial={false}>
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                isOwn={Boolean(currentUserName.trim() && message.sender === currentUserName.trim())}
                onCopy={onCopyMessage}
                copied={copiedMessageId === message.id}
              />
            ))}

            {showSkeleton ? <LoadingSkeleton key="skeleton" /> : isTyping ? <TypingIndicator key="typing" /> : null}
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

      <FloatingButtons
        onScrollToLatest={onScrollToLatest}
        onStartNewChat={onStartNewChat}
        isAtBottom={isAtBottom}
      />
    </div>
  );
}
