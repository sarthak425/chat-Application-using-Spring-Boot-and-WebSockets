import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import ChatHeader from '../components/ChatHeader';
import Composer from '../components/Composer';
import MessageList from '../components/MessageList';
import NewChatModal from '../components/NewChatModal';
import GroupCreateModal from '../components/GroupCreateModal';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { http } from '../lib/http';
import {
  createSocketClient,
  sendSocketMessage,
  sendTyping,
  sendReadReceipt,
  sendReaction,
  subscribeToConversation,
  subscribeToInbox,
  subscribeToPresence,
  subscribeToTyping,
  subscribeToUserMessages,
  subscribeToUserPresence,
} from '../lib/socket';

// ─── Helpers ────────────────────────────────────────────────────────────────

function previewForMessage(message) {
  if (!message) return 'No messages yet';
  if (message.deleted) return 'This message was deleted';
  if (message.messageType === 'IMAGE') return '📷 Photo';
  if (message.messageType === 'FILE') return '📎 File';
  if (message.messageType === 'AUDIO') return '🎤 Voice note';
  if (message.messageType === 'VIDEO') return '🎬 Video';
  return message.content || 'Message';
}

function upsertConversation(list, incoming) {
  const next = list.filter((c) => c.id !== incoming.id);
  return [incoming, ...next].sort(
    (a, b) => new Date(b.lastMessageAt || 0) - new Date(a.lastMessageAt || 0)
  );
}

function mergeMessage(list, incoming) {
  const next = [...list];
  const last = next[next.length - 1];

  // Replace optimistic placeholder
  if (
    last?.pending &&
    last.mine &&
    last.content === incoming.content &&
    last.fileUrl === incoming.fileUrl &&
    last.messageType === incoming.messageType
  ) {
    next[next.length - 1] = { ...incoming, pending: false };
    return next;
  }

  // Update existing (edit / read receipt / reaction)
  const index = next.findIndex((m) => m.id === incoming.id);
  if (index >= 0) {
    next[index] = incoming;
    return next;
  }

  return [...next, incoming];
}

// ─── Notification helpers ────────────────────────────────────────────────────

let notifSound = null;
function playNotificationSound() {
  try {
    if (!notifSound) {
      notifSound = new Audio(
        'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2ozLS1LoNbwtHA8MiZFj8rtt3VFMiQ/hb/nwYBRPi9AfbviwH9SPS1CgbvgwXxRPi5Cf7rdwXxRP...'
      );
    }
    notifSound.currentTime = 0;
    notifSound.play().catch(() => {});
  } catch {}
}

function showBrowserNotification(title, body) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  try {
    new Notification(title, { body, icon: '/favicon.ico', tag: 'chat-message' });
  } catch {}
}

function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function ChatPage() {
  const { user, logout, token } = useAuth();
  const { pushToast } = useToast();

  const [conversations, setConversations] = useState([]);
  const [messagesByConversation, setMessagesByConversation] = useState({});
  const [hasMoreByConversation, setHasMoreByConversation] = useState({});
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [composerValue, setComposerValue] = useState('');
  const [attachment, setAttachment] = useState(null);
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [groupCreateOpen, setGroupCreateOpen] = useState(false);
  const [contactQuery, setContactQuery] = useState('');
  const [contacts, setContacts] = useState([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [typingByConversation, setTypingByConversation] = useState({});
  const [copiedMessageId, setCopiedMessageId] = useState(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [replyingTo, setReplyingTo] = useState(null);   // MessageResponse | null
  const [sidebarTab, setSidebarTab] = useState('chats'); // 'chats' | 'groups'

  const socketRef = useRef(null);
  const userMessagesSubRef = useRef(null);
  const inboxSubRef = useRef(null);
  const presenceSubRef = useRef(null);
  const conversationSubRef = useRef(null);
  const typingSubRef = useRef(null);
  const scrollRef = useRef(null);
  const activeConversationIdRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const deferredSearchQuery = useDeferredValue(searchQuery.trim().toLowerCase());

  // ── Derived state ──────────────────────────────────────────────────────────

  const activeConversation = useMemo(
    () => conversations.find((c) => c.id === activeConversationId) || null,
    [activeConversationId, conversations]
  );

  const activePeer = useMemo(() => {
    if (!activeConversation || !user) return null;
    return activeConversation.participants?.find((p) => p.id !== user.id) || null;
  }, [activeConversation, user]);

  const activeMessages = messagesByConversation[activeConversationId] || [];

  const filteredConversations = useMemo(() => {
    let list = conversations;
    if (sidebarTab === 'groups') {
      list = conversations.filter((c) => c.type === 'GROUP');
    }
    if (!deferredSearchQuery) return list;
    return list.filter((c) => {
      const title = (c.name || '').toLowerCase();
      const preview = (c.lastMessagePreview || '').toLowerCase();
      const participantMatch = c.participants?.some(
        (p) =>
          p.username.toLowerCase().includes(deferredSearchQuery) ||
          p.email.toLowerCase().includes(deferredSearchQuery)
      );
      return title.includes(deferredSearchQuery) || preview.includes(deferredSearchQuery) || participantMatch;
    });
  }, [conversations, deferredSearchQuery, sidebarTab]);

  // ── WebSocket connection ───────────────────────────────────────────────────

  const subscribeActiveConversation = useCallback(
    (client, conversationId) => {
      if (!client?.connected || !conversationId) return;

      conversationSubRef.current?.unsubscribe();
      typingSubRef.current?.unsubscribe();

      // Subscribe to conversation-level updates (for the open chat view)
      conversationSubRef.current = subscribeToConversation(client, conversationId, (msg) => {
        msg.mine = msg.senderId === user?.id;
        setMessagesByConversation((cur) => ({
          ...cur,
          [conversationId]: mergeMessage(cur[conversationId] || [], msg),
        }));
      });

      typingSubRef.current = subscribeToTyping(client, conversationId, (evt) => {
        if (evt.userId === user?.id) return;
        setTypingByConversation((cur) => ({
          ...cur,
          [conversationId]: evt.typing ? evt.username : false,
        }));
      });
    },
    [user?.id]
  );

  const connectSocket = useCallback(() => {
    if (!token || !user) return;

    const client = createSocketClient(token, {
      onConnect: () => {
        setConnectionStatus('online');
        requestNotificationPermission();

        // Cleanup old subscriptions
        userMessagesSubRef.current?.unsubscribe();
        inboxSubRef.current?.unsubscribe();
        presenceSubRef.current?.unsubscribe();

        // ✅ THE FIX: subscribe to personal message feed — receives messages for ALL conversations
        userMessagesSubRef.current = subscribeToUserMessages(client, user.id, (msg) => {
          msg.mine = msg.senderId === user.id;
          const convId = msg.conversationId;

          setMessagesByConversation((cur) => ({
            ...cur,
            [convId]: mergeMessage(cur[convId] || [], msg),
          }));

          // Update sidebar preview
          setConversations((cur) =>
            cur.map((c) =>
              c.id === convId
                ? {
                    ...c,
                    lastMessagePreview: previewForMessage(msg),
                    lastMessageAt: msg.timestamp,
                    unreadCount: msg.mine
                      ? c.unreadCount
                      : activeConversationIdRef.current === convId
                      ? 0
                      : (c.unreadCount || 0) + 1,
                  }
                : c
            )
          );

          // Notify if message is from someone else and conversation is not active
          if (!msg.mine && activeConversationIdRef.current !== convId) {
            const senderName = msg.senderName || 'Someone';
            playNotificationSound();
            showBrowserNotification(senderName, msg.content || '📎 Attachment');
          }
        });

        // Sidebar inbox summaries (conversation order / unread counts)
        inboxSubRef.current = subscribeToInbox(client, user.id, (summary) => {
          setConversations((cur) => upsertConversation(cur, summary));
        });

        // Presence updates
        presenceSubRef.current = subscribeToPresence(client, (presence) => {
          setConversations((cur) =>
            cur.map((c) => ({
              ...c,
              participants: c.participants?.map((p) =>
                p.id === presence.id
                  ? { ...p, onlineStatus: presence.onlineStatus, lastSeen: presence.lastSeen }
                  : p
              ),
            }))
          );
        });

        // Resubscribe to active conversation if any
        if (activeConversationIdRef.current) {
          subscribeActiveConversation(client, activeConversationIdRef.current);
        }
      },
      onDisconnect: () => setConnectionStatus('offline'),
      onError: (error) => {
        setConnectionStatus('offline');
        pushToast(error);
      },
    });

    socketRef.current = client;
    return () => client.deactivate();
  }, [pushToast, token, user, subscribeActiveConversation]);

  useEffect(() => {
    const cleanup = connectSocket();
    return cleanup;
  }, [connectSocket]);

  // ── Load initial conversations ─────────────────────────────────────────────

  useEffect(() => {
    let active = true;
    async function loadConversations() {
      setIsLoading(true);
      try {
        const res = await http.get('/api/conversations');
        if (!active) return;
        setConversations(res.data);
      } catch (error) {
        pushToast(error?.response?.data?.message || 'Unable to load conversations');
      } finally {
        if (active) setIsLoading(false);
      }
    }
    loadConversations();
    return () => { active = false; };
  }, [pushToast]);

  // ── Sync activeConversationIdRef ───────────────────────────────────────────

  useEffect(() => {
    activeConversationIdRef.current = activeConversationId;
  }, [activeConversationId]);

  // ── Fetch conversation detail & messages on select ─────────────────────────

  const fetchConversation = useCallback(async (conversationId) => {
    if (!conversationId) return;
    try {
      const res = await http.get(`/api/conversations/${conversationId}/messages/page`);
      // Use paginated endpoint
      const { messages, hasMore } = res.data || {};
      setMessagesByConversation((cur) => ({ ...cur, [conversationId]: messages || [] }));
      setHasMoreByConversation((cur) => ({ ...cur, [conversationId]: hasMore }));

      // Mark as read
      await http.post(`/api/conversations/${conversationId}/read`);
      setConversations((cur) =>
        cur.map((c) => (c.id === conversationId ? { ...c, unreadCount: 0 } : c))
      );
    } catch {
      // Fallback to non-paginated
      try {
        const res = await http.get(`/api/conversations/${conversationId}`);
        setConversations((cur) => upsertConversation(cur, res.data.conversation));
        setMessagesByConversation((cur) => ({ ...cur, [conversationId]: res.data.messages }));
      } catch (error) {
        pushToast(error?.response?.data?.message || 'Unable to open conversation');
      }
    }
  }, [pushToast]);

  useEffect(() => {
    if (!activeConversationId) return;
    fetchConversation(activeConversationId);
  }, [activeConversationId, fetchConversation]);

  // ── Subscribe to active conversation ──────────────────────────────────────

  useEffect(() => {
    if (!socketRef.current?.connected || !activeConversationId) return;
    subscribeActiveConversation(socketRef.current, activeConversationId);
  }, [activeConversationId, subscribeActiveConversation]);

  // ── Infinite scroll: load older messages ──────────────────────────────────

  const loadOlderMessages = useCallback(async () => {
    if (!activeConversationId || isLoadingOlder || !hasMoreByConversation[activeConversationId]) return;

    const messages = messagesByConversation[activeConversationId] || [];
    const oldestId = messages[0]?.id;
    if (!oldestId) return;

    const scrollEl = scrollRef.current;
    const scrollHeightBefore = scrollEl?.scrollHeight || 0;

    setIsLoadingOlder(true);
    try {
      const res = await http.get(`/api/messages/conversation/${activeConversationId}/page`, {
        params: { before: oldestId },
      });
      const { messages: older, hasMore } = res.data;
      setMessagesByConversation((cur) => ({
        ...cur,
        [activeConversationId]: [...older, ...(cur[activeConversationId] || [])],
      }));
      setHasMoreByConversation((cur) => ({ ...cur, [activeConversationId]: hasMore }));

      // Restore scroll position after prepending
      requestAnimationFrame(() => {
        if (scrollEl) {
          scrollEl.scrollTop = scrollEl.scrollHeight - scrollHeightBefore;
        }
      });
    } catch {
      /* silently ignore */
    } finally {
      setIsLoadingOlder(false);
    }
  }, [activeConversationId, isLoadingOlder, hasMoreByConversation, messagesByConversation]);

  // ── Auto-scroll to bottom on new messages ─────────────────────────────────

  useEffect(() => {
    if (!isAtBottom) return;
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [activeConversationId, activeMessages.length, typingByConversation[activeConversationId], isAtBottom]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el && activeConversationId) {
      setTimeout(() => { el.scrollTop = el.scrollHeight; }, 50);
    }
  }, [activeConversationId]);

  // ── Typing indicator auto-clear ────────────────────────────────────────────

  useEffect(() => {
    const typingValue = typingByConversation[activeConversationId];
    if (!typingValue) return;
    const t = window.setTimeout(() => {
      setTypingByConversation((cur) => ({ ...cur, [activeConversationId]: false }));
    }, 3000);
    return () => window.clearTimeout(t);
  }, [activeConversationId, typingByConversation]);

  // ── Load contacts for new chat modal ──────────────────────────────────────

  useEffect(() => {
    let active = true;
    async function loadContacts() {
      if (!newChatOpen || !contactQuery.trim()) { setContacts([]); return; }
      setContactsLoading(true);
      try {
        const res = await http.get('/api/users/search', { params: { q: contactQuery } });
        if (active) setContacts(res.data);
      } catch {
        if (active) setContacts([]);
      } finally {
        if (active) setContactsLoading(false);
      }
    }
    const t = window.setTimeout(loadContacts, 250);
    return () => { active = false; window.clearTimeout(t); };
  }, [contactQuery, newChatOpen]);

  // ── Send message ───────────────────────────────────────────────────────────

  async function handleSendMessage() {
    const content = composerValue.trim();
    if (!content && !attachment) return;
    if (!activeConversation) { pushToast('Choose a conversation first'); return; }

    try {
      let fileUrl = '';
      let messageType = 'TEXT';

      if (attachment) {
        const formData = new FormData();
        formData.append('file', attachment);
        const uploadRes = await http.post('/api/files/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        fileUrl = uploadRes.data.fileUrl;
        if (attachment.type?.startsWith('image/')) messageType = 'IMAGE';
        else if (attachment.type?.startsWith('audio/')) messageType = 'AUDIO';
        else if (attachment.type?.startsWith('video/')) messageType = 'VIDEO';
        else messageType = 'FILE';
      }

      // Optimistic message
      const optimistic = {
        id: crypto.randomUUID(),
        conversationId: activeConversation.id,
        senderId: user.id,
        senderName: user.username,
        content,
        fileUrl,
        messageType,
        status: 'SENT',
        timestamp: new Date().toISOString(),
        mine: true,
        pending: true,
        replyTo: replyingTo ? {
          id: replyingTo.id,
          senderId: replyingTo.senderId,
          senderName: replyingTo.senderName,
          content: replyingTo.content,
          messageType: replyingTo.messageType,
        } : null,
      };

      setMessagesByConversation((cur) => ({
        ...cur,
        [activeConversation.id]: mergeMessage(cur[activeConversation.id] || [], optimistic),
      }));
      setConversations((cur) =>
        cur.map((c) =>
          c.id === activeConversation.id
            ? { ...c, lastMessagePreview: previewForMessage(optimistic), lastMessageAt: optimistic.timestamp, unreadCount: 0 }
            : c
        )
      );

      sendSocketMessage(socketRef.current, {
        conversationId: activeConversation.id,
        content,
        fileUrl,
        messageType,
        replyToId: replyingTo?.id || null,
      });

      setComposerValue('');
      setAttachment(null);
      setReplyingTo(null);
      setIsAtBottom(true);
    } catch (error) {
      pushToast(error?.response?.data?.message || 'Unable to send message');
    }
  }

  // ── Typing ────────────────────────────────────────────────────────────────

  function handleTyping(value) {
    setComposerValue(value);
    if (!socketRef.current?.connected || !activeConversationId) return;

    sendTyping(socketRef.current, { conversationId: activeConversationId, typing: true });
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      sendTyping(socketRef.current, { conversationId: activeConversationId, typing: false });
    }, 2000);
  }

  // ── Reactions ─────────────────────────────────────────────────────────────

  function handleReact(messageId, emoji) {
    sendReaction(socketRef.current, { messageId, emoji });
  }

  // ── Copy ──────────────────────────────────────────────────────────────────

  function handleCopyMessage(messageId, text) {
    navigator.clipboard?.writeText(text);
    setCopiedMessageId(messageId);
    window.setTimeout(() => setCopiedMessageId(null), 1200);
  }

  // ── Voice ─────────────────────────────────────────────────────────────────

  function handleVoiceMessage(blob) {
    setAttachment(new File([blob], `voice-${Date.now()}.webm`, { type: blob.type || 'audio/webm' }));
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  async function handleDeleteMessage(messageId) {
    try {
      await http.delete(`/api/messages/${messageId}`);
    } catch (error) {
      pushToast(error?.response?.data?.message || 'Unable to delete message');
    }
  }

  // ── Edit ──────────────────────────────────────────────────────────────────

  async function handleEditMessage(messageId, newContent) {
    try {
      await http.patch(`/api/messages/${messageId}`, { content: newContent });
    } catch (error) {
      pushToast(error?.response?.data?.message || 'Unable to edit message');
    }
  }

  // ── Scroll ────────────────────────────────────────────────────────────────

  function handleScroll() {
    const el = scrollRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    setIsAtBottom(nearBottom);

    // Trigger infinite scroll at top
    if (el.scrollTop < 80) {
      loadOlderMessages();
    }
  }

  function scrollToLatest() {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    setIsAtBottom(true);
  }

  // ── Open conversation with contact ────────────────────────────────────────

  async function openConversationWithContact(contact) {
    try {
      const res = await http.post('/api/conversations/direct', { participantId: contact.id });
      setConversations((cur) => upsertConversation(cur, res.data));
      setActiveConversationId(res.data.id);
      setNewChatOpen(false);
      setContactQuery('');
    } catch (error) {
      pushToast(error?.response?.data?.message || 'Unable to start chat');
    }
  }

  async function handleCreateGroup(name, avatarUrl, participantIds) {
    try {
      const res = await http.post('/api/conversations/group', { name, avatarUrl, participantIds });
      setConversations((cur) => upsertConversation(cur, res.data));
      setActiveConversationId(res.data.id);
      setGroupCreateOpen(false);
    } catch (error) {
      pushToast(error?.response?.data?.message || 'Unable to create group');
    }
  }

  function onLogout() {
    logout();
    window.location.href = '/login';
  }

  const typingLabel = typingByConversation[activeConversationId]
    ? `${typingByConversation[activeConversationId]} is typing`
    : '';

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="h-screen overflow-hidden bg-wa-bg text-white">
      <div className="grid h-full grid-cols-1 lg:grid-cols-[380px_1fr]">
        <Sidebar
          conversations={filteredConversations}
          activeConversationId={activeConversationId}
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
          onCreateConversation={() => setNewChatOpen(true)}
          onCreateGroup={() => setGroupCreateOpen(true)}
          onSelectConversation={setActiveConversationId}
          profile={user}
          onLogout={onLogout}
          connectionStatus={connectionStatus}
          currentUserId={user?.id}
          sidebarTab={sidebarTab}
          onSidebarTabChange={setSidebarTab}
          isLoading={isLoading}
        />

        <main className="flex min-w-0 flex-col bg-wa-chat-bg relative">
          <ChatHeader
            conversation={activeConversation}
            peer={activePeer}
            online={Boolean(activePeer?.onlineStatus)}
            typingLabel={typingLabel}
            onNewChat={() => setNewChatOpen(true)}
          />

          <MessageList
            messages={activeMessages}
            isTyping={Boolean(typingByConversation[activeConversationId])}
            typingLabel={typingLabel}
            onCopyMessage={handleCopyMessage}
            onReact={handleReact}
            onReply={setReplyingTo}
            onDeleteMessage={handleDeleteMessage}
            onEditMessage={handleEditMessage}
            copiedMessageId={copiedMessageId}
            isAtBottom={isAtBottom}
            onScrollToLatest={scrollToLatest}
            onStartNewChat={() => setNewChatOpen(true)}
            onScroll={handleScroll}
            scrollRef={scrollRef}
            isLoading={isLoading}
            isLoadingOlder={isLoadingOlder}
            currentUserId={user?.id}
          />

          <Composer
            value={composerValue}
            onChange={handleTyping}
            onSend={handleSendMessage}
            attachment={attachment}
            onAttachmentSelect={setAttachment}
            onRemoveAttachment={() => setAttachment(null)}
            onVoiceMessage={handleVoiceMessage}
            replyingTo={replyingTo}
            onCancelReply={() => setReplyingTo(null)}
            disabled={!activeConversation}
          />
        </main>
      </div>

      <NewChatModal
        open={newChatOpen}
        contacts={contacts}
        searchQuery={contactQuery}
        onSearchQueryChange={setContactQuery}
        onSelectContact={openConversationWithContact}
        onClose={() => setNewChatOpen(false)}
        loading={contactsLoading}
      />

      <GroupCreateModal
        open={groupCreateOpen}
        onClose={() => setGroupCreateOpen(false)}
        onCreateGroup={handleCreateGroup}
      />
    </div>
  );
}
