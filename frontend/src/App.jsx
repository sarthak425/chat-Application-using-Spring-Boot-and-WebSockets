import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ChatHeader from './components/ChatHeader';
import Composer from './components/Composer';
import MessageList from './components/MessageList';
import Sidebar from './components/Sidebar';
import {
  appendMessage,
  createMessage,
  SHARED_CONVERSATION_ID,
  getConversationPreview,
  loadInitialState,
  persistState,
  setConversationTyping,
  summarizeTitle
} from './lib/chatStorage';
import { createChatClient, registerConversation, sendChatMessage, subscribeToConversation } from './lib/chatSocket';

const BOT_NAME = 'AI Assistant';

export default function App() {
  const initialState = useMemo(() => loadInitialState(), []);
  const [conversations, setConversations] = useState(initialState.conversations);
  const [activeConversationId, setActiveConversationId] = useState(initialState.activeConversationId);
  const [profileName, setProfileName] = useState(initialState.profileName);
  const [composerValue, setComposerValue] = useState('');
  const [attachment, setAttachment] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedMessageId, setCopiedMessageId] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [typingMap, setTypingMap] = useState({});
  const [isAtBottom, setIsAtBottom] = useState(true);

  const socketRef = useRef(null);
  const subscriptionsRef = useRef(new Map());
  const registeredConversationsRef = useRef(new Set());
  const conversationsRef = useRef(conversations);
  const profileNameRef = useRef(profileName);
  const activeConversationIdRef = useRef(activeConversationId);
  const scrollRef = useRef(null);

  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);

  useEffect(() => {
    profileNameRef.current = profileName;
  }, [profileName]);

  useEffect(() => {
    activeConversationIdRef.current = activeConversationId;
  }, [activeConversationId]);

  useEffect(() => {
    persistState({ conversations, activeConversationId, profileName });
  }, [conversations, activeConversationId, profileName]);

  const ensureSubscription = useCallback((client) => {
    if (!client?.connected || subscriptionsRef.current.has(SHARED_CONVERSATION_ID)) {
      return;
    }

    const subscription = subscribeToConversation(client, SHARED_CONVERSATION_ID, handleSocketMessage);
    subscriptionsRef.current.set(SHARED_CONVERSATION_ID, subscription);

    if (!registeredConversationsRef.current.has(SHARED_CONVERSATION_ID)) {
      registerConversation(client, {
        clientId: SHARED_CONVERSATION_ID,
        sender: profileNameRef.current,
        content: '',
        type: 'SYSTEM'
      });
      registeredConversationsRef.current.add(SHARED_CONVERSATION_ID);
    }
  }, []);

  function handleSocketMessage(incomingMessage) {
    const conversationId = incomingMessage.clientId || SHARED_CONVERSATION_ID;

    if (incomingMessage.type === 'BOT_TYPING') {
      setTypingMap((currentTypingMap) => ({
        ...currentTypingMap,
        [conversationId]: true
      }));
      setConversations((currentConversations) =>
        setConversationTyping(currentConversations, conversationId, true)
      );
      return;
    }

    const normalizedMessage = createMessage({
      ...incomingMessage,
      clientId: conversationId,
      pending: false
    });

    setTypingMap((currentTypingMap) => ({
      ...currentTypingMap,
      [conversationId]: normalizedMessage.type === 'BOT' ? false : currentTypingMap[conversationId] || false
    }));

    setConversations((currentConversations) =>
      appendMessage(currentConversations, conversationId, normalizedMessage)
    );
  }

  useEffect(() => {
    const client = createChatClient({
      onConnect: (stompClient) => {
        setConnectionStatus('online');
        ensureSubscription(stompClient);
      },
      onDisconnect: () => {
        setConnectionStatus('offline');
      },
      onError: () => {
        setConnectionStatus('offline');
      }
    });

    socketRef.current = client;

    return () => {
      client.deactivate();
    };
  }, [ensureSubscription]);

  useEffect(() => {
    if (!socketRef.current?.connected) {
      return;
    }

    ensureSubscription(socketRef.current);
  }, [conversations, ensureSubscription]);

  const activeConversation = useMemo(() => {
    return (
      conversations.find((conversation) => conversation.id === activeConversationId) ||
      conversations[0] ||
      null
    );
  }, [activeConversationId, conversations]);

  useEffect(() => {
    const element = scrollRef.current;
    if (!element) {
      return;
    }

    element.scrollTop = element.scrollHeight;
  }, [activeConversationId, activeConversation?.messages.length, activeConversation && typingMap[activeConversation.id]]);

  const filteredConversations = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    if (!normalizedQuery) {
      return conversations;
    }

    return conversations.filter((conversation) => {
      const titleMatches = conversation.title.toLowerCase().includes(normalizedQuery);
      const previewMatches = getConversationPreview(conversation).toLowerCase().includes(normalizedQuery);
      return titleMatches || previewMatches;
    });
  }, [conversations, searchQuery]);

  function createNewConversation() {
    setConversations((currentConversations) =>
      currentConversations.map((conversation) =>
        conversation.id === SHARED_CONVERSATION_ID
          ? { ...conversation, messages: [], typing: false, updatedAt: Date.now(), title: 'Shared chat' }
          : conversation
      )
    );
    setActiveConversationId(SHARED_CONVERSATION_ID);
    setTypingMap((currentTypingMap) => ({
      ...currentTypingMap,
      [SHARED_CONVERSATION_ID]: false
    }));

    if (socketRef.current?.connected) {
      ensureSubscription(socketRef.current);
    }
  }

  function activateConversation(conversationId) {
    setActiveConversationId(conversationId);
  }

  function clearActiveConversation() {
    if (!activeConversation) {
      return;
    }

    setConversations((currentConversations) =>
      currentConversations.map((conversation) =>
        conversation.id === activeConversation.id
          ? { ...conversation, messages: [], typing: false, updatedAt: Date.now(), title: 'New chat' }
          : conversation
      )
    );
    setTypingMap((currentTypingMap) => ({
      ...currentTypingMap,
      [activeConversation.id]: false
    }));
  }

  function handleSendMessage() {
    const content = composerValue.trim();

    if (!content && !attachment) {
      return;
    }

    if (!activeConversation) {
      return;
    }

    if (!profileName.trim()) {
      return;
    }

    if (!socketRef.current?.connected) {
      return;
    }

    const finalContent = attachment ? `${content}${content ? '\n' : ''}\u{1F4CE} ${attachment.name}` : content;
    const optimisticMessage = createMessage({
      clientId: activeConversation.id,
      sender: profileName.trim(),
      content: finalContent,
      type: 'CHAT',
      pending: true
    });

    setConversations((currentConversations) => {
      const updated = appendMessage(currentConversations, activeConversation.id, optimisticMessage);
      return updated.map((conversation) =>
        conversation.id === activeConversation.id && conversation.title === 'New chat'
          ? { ...conversation, title: summarizeTitle(finalContent) }
          : conversation
      );
    });

    setComposerValue('');
    setAttachment(null);
    setTypingMap((currentTypingMap) => ({
      ...currentTypingMap,
      [activeConversation.id]: true
    }));

    sendChatMessage(socketRef.current, {
      clientId: activeConversation.id,
      sender: profileName.trim(),
      content: finalContent,
      type: 'CHAT'
    });
  }

  function handleCopyMessage(messageId, text) {
    navigator.clipboard?.writeText(text);
    setCopiedMessageId(messageId);
    window.setTimeout(() => setCopiedMessageId(null), 1200);
  }

  function handleVoiceInput() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = true;
    recognition.continuous = false;

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0].transcript)
        .join(' ');
      setComposerValue((currentValue) => `${currentValue}${transcript}`.trimStart());
    };

    recognition.start();
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

  return (
    <div className="h-screen overflow-hidden bg-wa-bg text-white">
      <div className="grid h-full grid-cols-1 lg:grid-cols-[360px_1fr]">
        <Sidebar
          conversations={filteredConversations}
          activeConversationId={activeConversationId}
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
          onCreateConversation={createNewConversation}
          onSelectConversation={activateConversation}
          onClearConversation={clearActiveConversation}
          profileName={profileName}
          onProfileNameChange={setProfileName}
          typingMap={typingMap}
          connectionStatus={connectionStatus}
        />

        <main className="flex min-w-0 flex-col bg-wa-surface">
          <ChatHeader botName={BOT_NAME} online={connectionStatus === 'online'} />

          <MessageList
            conversation={activeConversation}
            isTyping={Boolean(activeConversation && typingMap[activeConversation.id])}
          onCopyMessage={handleCopyMessage}
          copiedMessageId={copiedMessageId}
          isAtBottom={isAtBottom}
          onScrollToLatest={scrollToLatest}
          onStartNewChat={createNewConversation}
          onScroll={handleScroll}
          scrollRef={scrollRef}
        />

          <Composer
            value={composerValue}
            onChange={setComposerValue}
            onSend={handleSendMessage}
            onAttachmentSelect={setAttachment}
            attachment={attachment}
            onClearConversation={clearActiveConversation}
            onVoiceInput={handleVoiceInput}
          />
        </main>
      </div>
    </div>
  );
}
