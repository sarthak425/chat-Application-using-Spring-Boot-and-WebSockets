import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import ChatHeader from '../components/ChatHeader';
import Composer from '../components/Composer';
import MessageList from '../components/MessageList';
import NewChatModal from '../components/NewChatModal';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { http } from '../lib/http';
import {
  createSocketClient,
  sendSocketMessage,
  subscribeToConversation,
  subscribeToInbox,
  subscribeToPresence,
  subscribeToTyping
} from '../lib/socket';

function previewForMessage(message) {
  if (!message) {
    return 'No messages yet';
  }

  if (message.deleted) {
    return 'This message was deleted';
  }

  if (message.messageType === 'IMAGE') return 'Photo';
  if (message.messageType === 'FILE') return 'File';
  if (message.messageType === 'AUDIO') return 'Voice note';
  if (message.messageType === 'VIDEO') return 'Video';
  return message.content || 'Message';
}

function upsertConversation(list, incoming) {
  const next = list.filter((conversation) => conversation.id !== incoming.id);
  return [incoming, ...next].sort((a, b) => new Date(b.lastMessageAt || 0) - new Date(a.lastMessageAt || 0));
}

function mergeMessage(list, incoming) {
  const next = [...list];
  const last = next[next.length - 1];

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

  const index = next.findIndex((message) => message.id === incoming.id);
  if (index >= 0) {
    next[index] = incoming;
    return next;
  }

  return [...next, incoming];
}

export default function ChatPage() {
  const { user, logout, token } = useAuth();
  const { pushToast } = useToast();

  const [conversations, setConversations] = useState([]);
  const [messagesByConversation, setMessagesByConversation] = useState({});
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [composerValue, setComposerValue] = useState('');
  const [attachment, setAttachment] = useState(null);
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [contactQuery, setContactQuery] = useState('');
  const [contacts, setContacts] = useState([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [typingByConversation, setTypingByConversation] = useState({});
  const [copiedMessageId, setCopiedMessageId] = useState(null);
  const [isAtBottom, setIsAtBottom] = useState(true);

  const socketRef = useRef(null);
  const inboxSubscriptionRef = useRef(null);
  const presenceSubscriptionRef = useRef(null);
  const conversationSubscriptionRef = useRef(null);
  const typingSubscriptionRef = useRef(null);
  const scrollRef = useRef(null);
  const activeConversationIdRef = useRef(null);
  const deferredSearchQuery = useDeferredValue(searchQuery.trim().toLowerCase());

  const activeConversation = useMemo(() => {
    return conversations.find((conversation) => conversation.id === activeConversationId) || null;
  }, [activeConversationId, conversations]);

  const activePeer = useMemo(() => {
    if (!activeConversation || !user) {
      return null;
    }

    return activeConversation.participants?.find((participant) => participant.id !== user.id) || null;
  }, [activeConversation, user]);

  const activeMessages = messagesByConversation[activeConversationId] || [];
  const filteredConversations = useMemo(() => {
    if (!deferredSearchQuery) {
      return conversations;
    }

    return conversations.filter((conversation) => {
      const title = (conversation.name || '').toLowerCase();
      const preview = (conversation.lastMessagePreview || '').toLowerCase();
      const participantMatch = conversation.participants?.some((participant) =>
        participant.username.toLowerCase().includes(deferredSearchQuery) ||
        participant.email.toLowerCase().includes(deferredSearchQuery)
      );
      return title.includes(deferredSearchQuery) || preview.includes(deferredSearchQuery) || participantMatch;
    });
  }, [conversations, deferredSearchQuery]);

  const connectSocket = useCallback(() => {
    if (!token || !user) {
      return;
    }

    const client = createSocketClient(token, {
      onConnect: () => {
        setConnectionStatus('online');
        if (inboxSubscriptionRef.current) inboxSubscriptionRef.current.unsubscribe();
        if (presenceSubscriptionRef.current) presenceSubscriptionRef.current.unsubscribe();

        inboxSubscriptionRef.current = subscribeToInbox(client, user.id, (summary) => {
          setConversations((current) => upsertConversation(current, summary));
        });

        presenceSubscriptionRef.current = subscribeToPresence(client, (presence) => {
          setConversations((current) =>
            current.map((conversation) => ({
              ...conversation,
              participants: conversation.participants?.map((participant) =>
                participant.id === presence.id
                  ? { ...participant, onlineStatus: presence.onlineStatus, lastSeen: presence.lastSeen }
                  : participant
              )
            }))
          );
        });

        if (activeConversationIdRef.current) {
          subscribeActiveConversation(client, activeConversationIdRef.current);
        }
      },
      onDisconnect: () => setConnectionStatus('offline'),
      onError: (error) => {
        setConnectionStatus('offline');
        pushToast(error);
      }
    });

    socketRef.current = client;
    return () => client.deactivate();
  }, [pushToast, token, user]);

  useEffect(() => {
    const cleanup = connectSocket();
    return cleanup;
  }, [connectSocket]);

  useEffect(() => {
    let active = true;

    async function loadConversations() {
      setIsLoading(true);
      try {
        const response = await http.get('/api/conversations');
        if (!active) {
          return;
        }

        setConversations(response.data);
        if (response.data.length > 0) {
          setActiveConversationId(response.data[0].id);
        }
      } catch (error) {
        pushToast(error?.response?.data?.message || 'Unable to load conversations');
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    loadConversations();
    return () => {
      active = false;
    };
  }, [pushToast]);

  const fetchConversation = useCallback(async (conversationId) => {
    if (!conversationId) {
      return;
    }

    try {
      const response = await http.get(`/api/conversations/${conversationId}`);
      setConversations((current) => upsertConversation(current, response.data.conversation));
      setMessagesByConversation((current) => ({
        ...current,
        [conversationId]: response.data.messages
      }));
      await http.post(`/api/conversations/${conversationId}/read`);
    } catch (error) {
      pushToast(error?.response?.data?.message || 'Unable to open conversation');
    }
  }, [pushToast]);

  useEffect(() => {
    activeConversationIdRef.current = activeConversationId;
  }, [activeConversationId]);

  useEffect(() => {
    if (!activeConversationId) {
      return;
    }

    fetchConversation(activeConversationId);
  }, [activeConversationId, fetchConversation]);

  useEffect(() => {
    if (!socketRef.current?.connected || !activeConversationId) {
      return;
    }

    subscribeActiveConversation(socketRef.current, activeConversationId);
  }, [activeConversationId, user?.id]);

  function subscribeActiveConversation(client, conversationId) {
    if (!client?.connected || !conversationId) {
      return;
    }

    if (conversationSubscriptionRef.current) {
      conversationSubscriptionRef.current.unsubscribe();
    }

    if (typingSubscriptionRef.current) {
      typingSubscriptionRef.current.unsubscribe();
    }

    conversationSubscriptionRef.current = subscribeToConversation(
      client,
      conversationId,
      (incomingMessage) => {
        setMessagesByConversation((current) => {
          const nextMessages = mergeMessage(current[conversationId] || [], incomingMessage);
          return { ...current, [conversationId]: nextMessages };
        });

        setConversations((current) =>
          current.map((conversation) =>
            conversation.id === conversationId
              ? {
                  ...conversation,
                  lastMessagePreview: previewForMessage(incomingMessage),
                  lastMessageAt: incomingMessage.timestamp,
                  unreadCount: incomingMessage.mine ? conversation.unreadCount : 0
                }
              : conversation
          )
        );
      }
    );

    typingSubscriptionRef.current = subscribeToTyping(client, conversationId, (typingEvent) => {
      if (typingEvent.userId === user?.id) {
        return;
      }

      setTypingByConversation((current) => ({
        ...current,
        [conversationId]: typingEvent.typing ? typingEvent.username : false
      }));
    });
  }

  useEffect(() => {
    const element = scrollRef.current;
    if (!element) {
      return;
    }

    element.scrollTop = element.scrollHeight;
  }, [activeConversationId, activeMessages.length, typingByConversation[activeConversationId]]);

  useEffect(() => {
    let active = true;

    async function loadContacts() {
      if (!newChatOpen || !contactQuery.trim()) {
        setContacts([]);
        return;
      }

      setContactsLoading(true);
      try {
        const response = await http.get('/api/users/search', { params: { q: contactQuery } });
        if (active) {
          setContacts(response.data);
        }
      } catch {
        if (active) {
          setContacts([]);
        }
      } finally {
        if (active) {
          setContactsLoading(false);
        }
      }
    }

    const timeout = window.setTimeout(loadContacts, 250);
    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  }, [contactQuery, newChatOpen]);

  useEffect(() => {
    const typingValue = typingByConversation[activeConversationId];
    if (!socketRef.current?.connected || !activeConversationId || !typingValue) {
      return undefined;
    }

    const timeout = window.setTimeout(() => {
      setTypingByConversation((current) => ({ ...current, [activeConversationId]: false }));
    }, 1800);

    return () => window.clearTimeout(timeout);
  }, [activeConversationId, typingByConversation]);

  async function openConversationWithContact(contact) {
    try {
      const response = await http.post('/api/conversations/direct', { participantId: contact.id });
      setConversations((current) => upsertConversation(current, response.data));
      setActiveConversationId(response.data.id);
      setNewChatOpen(false);
      setContactQuery('');
    } catch (error) {
      pushToast(error?.response?.data?.message || 'Unable to start chat');
    }
  }

  async function handleSendMessage() {
    const content = composerValue.trim();

    if (!content && !attachment) {
      return;
    }

    if (!activeConversation) {
      pushToast('Choose a conversation first');
      return;
    }

    try {
      let fileUrl = '';
      let messageType = 'TEXT';

      if (attachment) {
        const formData = new FormData();
        formData.append('file', attachment);
        const uploadResponse = await http.post('/api/files/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        fileUrl = uploadResponse.data.fileUrl;
        if (attachment.type?.startsWith('image/')) {
          messageType = 'IMAGE';
        } else if (attachment.type?.startsWith('audio/')) {
          messageType = 'AUDIO';
        } else if (attachment.type?.startsWith('video/')) {
          messageType = 'VIDEO';
        } else {
          messageType = 'FILE';
        }
      }

      const optimisticMessage = {
        id: crypto.randomUUID(),
        conversationId: activeConversation.id,
        senderId: user.id,
        senderName: user.username,
        content,
        fileUrl,
        messageType,
        status: 'SENT',
        timestamp: Date.now(),
        mine: true,
        pending: true
      };

      setMessagesByConversation((current) => ({
        ...current,
        [activeConversation.id]: mergeMessage(current[activeConversation.id] || [], optimisticMessage)
      }));

      setConversations((current) =>
        current.map((conversation) =>
          conversation.id === activeConversation.id
            ? {
                ...conversation,
                lastMessagePreview: previewForMessage(optimisticMessage),
                lastMessageAt: optimisticMessage.timestamp,
                unreadCount: 0
              }
            : conversation
        )
      );

      sendSocketMessage(socketRef.current, {
        conversationId: activeConversation.id,
        content,
        fileUrl,
        messageType
      });

      setComposerValue('');
      setAttachment(null);
    } catch (error) {
      pushToast(error?.response?.data?.message || 'Unable to send message');
    }
  }

  function handleVoiceMessage(blob) {
    const file = new File([blob], `voice-${Date.now()}.webm`, { type: blob.type || 'audio/webm' });
    setAttachment(file);
  }

  function handleCopyMessage(messageId, text) {
    navigator.clipboard?.writeText(text);
    setCopiedMessageId(messageId);
    window.setTimeout(() => setCopiedMessageId(null), 1200);
  }

  function handleScroll() {
    const element = scrollRef.current;
    if (!element) {
      return;
    }

    const nearBottom = element.scrollHeight - element.scrollTop - element.clientHeight < 120;
    setIsAtBottom(nearBottom);
  }

  function scrollToLatest() {
    const element = scrollRef.current;
    if (!element) {
      return;
    }

    element.scrollTo({
      top: element.scrollHeight,
      behavior: 'smooth'
    });
    setIsAtBottom(true);
  }

  function onLogout() {
    logout();
    window.location.href = '/login';
  }

  const typingLabel = typingByConversation[activeConversationId]
    ? `${typingByConversation[activeConversationId]} is typing`
    : 'Someone is typing';

  return (
    <div className="h-screen overflow-hidden bg-wa-bg text-white">
      <div className="grid h-full grid-cols-1 lg:grid-cols-[360px_1fr]">
        <Sidebar
          conversations={filteredConversations}
          activeConversationId={activeConversationId}
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
          onCreateConversation={() => setNewChatOpen(true)}
          onSelectConversation={setActiveConversationId}
          profile={user}
          onLogout={onLogout}
          connectionStatus={connectionStatus}
          currentUserId={user?.id}
        />

        <main className="flex min-w-0 flex-col bg-wa-surface">
          <ChatHeader
            conversation={activeConversation}
            peer={activePeer}
            online={Boolean(activePeer?.onlineStatus)}
            onNewChat={() => setNewChatOpen(true)}
          />

          <MessageList
            messages={activeMessages}
            isTyping={Boolean(typingByConversation[activeConversationId])}
            typingLabel={typingLabel}
            onCopyMessage={handleCopyMessage}
            copiedMessageId={copiedMessageId}
            isAtBottom={isAtBottom}
            onScrollToLatest={scrollToLatest}
            onStartNewChat={() => setNewChatOpen(true)}
            onScroll={handleScroll}
            scrollRef={scrollRef}
            isLoading={isLoading}
          />

          <Composer
            value={composerValue}
            onChange={setComposerValue}
            onSend={handleSendMessage}
            attachment={attachment}
            onAttachmentSelect={setAttachment}
            onRemoveAttachment={() => setAttachment(null)}
            onVoiceMessage={handleVoiceMessage}
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
    </div>
  );
}
