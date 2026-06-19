const STORAGE_KEYS = {
  conversations: 'chatbox.react.conversations.v1',
  activeConversationId: 'chatbox.react.activeConversation.v1',
  profileName: 'chatbox.react.profileName.v1',
  legacyClientId: 'chatBox.clientId.v1'
};

export const SHARED_CONVERSATION_ID = 'shared-room';

function makeId() {
  if (window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }

  return `chat-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function safeParse(value, fallback) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

export function createConversation({
  id = makeId(),
  title = 'New chat',
  messages = [],
  createdAt = Date.now(),
  updatedAt = Date.now(),
  typing = false
} = {}) {
  return {
    id,
    title,
    messages,
    createdAt,
    updatedAt,
    typing
  };
}

export function createMessage({
  id = makeId(),
  clientId,
  sender = 'ChatBot',
  content = '',
  type = 'CHAT',
  timestamp = Date.now(),
  pending = false
} = {}) {
  return {
    id,
    clientId,
    sender,
    content,
    type,
    timestamp,
    pending
  };
}

export function summarizeTitle(content) {
  const cleanContent = (content || '').trim().replace(/\s+/g, ' ');

  if (!cleanContent) {
    return 'New chat';
  }

  const words = cleanContent.split(' ');
  return words.slice(0, 4).join(' ');
}

export function formatPreview(message) {
  if (!message) {
    return 'No messages yet';
  }

  if (message.type === 'SYSTEM') {
    return message.content || 'System message';
  }

  return message.content || 'Message';
}

function normalizeMessage(message, fallbackClientId) {
  return createMessage({
    ...message,
    clientId: message.clientId || fallbackClientId,
    pending: Boolean(message.pending)
  });
}

function normalizeConversation(conversation) {
  const messages = Array.isArray(conversation.messages)
    ? conversation.messages.map((message) => normalizeMessage(message, conversation.id))
    : [];

  return createConversation({
    ...conversation,
    messages
  });
}

export function loadInitialState() {
  const storedConversations = safeParse(localStorage.getItem(STORAGE_KEYS.conversations), null);
  const profileName = localStorage.getItem(STORAGE_KEYS.profileName) || 'Sam';

  if (Array.isArray(storedConversations) && storedConversations.length > 0) {
    const conversations = storedConversations.map(normalizeConversation);
    const sharedConversationIndex = conversations.findIndex((conversation) => conversation.id === SHARED_CONVERSATION_ID);

    if (sharedConversationIndex >= 0) {
      const sharedConversation = conversations[sharedConversationIndex];
      return {
        conversations: [sharedConversation, ...conversations.filter((_, index) => index !== sharedConversationIndex)],
        activeConversationId: SHARED_CONVERSATION_ID,
        profileName
      };
    }

    const [firstConversation, ...restConversations] = conversations;
    const sharedConversation = {
      ...firstConversation,
      id: SHARED_CONVERSATION_ID,
      title: firstConversation.title === 'New chat' ? 'Shared chat' : firstConversation.title
    };

    return {
      conversations: [sharedConversation, ...restConversations],
      activeConversationId: SHARED_CONVERSATION_ID,
      profileName
    };
  }

  const legacyClientId = localStorage.getItem(STORAGE_KEYS.legacyClientId);
  if (legacyClientId) {
    const legacyHistory = safeParse(localStorage.getItem(`chatBox.history.${legacyClientId}`), []);
    const legacySender = localStorage.getItem(`chatBox.sender.${legacyClientId}`) || profileName;
    const messages = Array.isArray(legacyHistory)
      ? legacyHistory.map((message) => normalizeMessage(message, legacyClientId))
      : [];

    return {
      conversations: [
        createConversation({
          id: SHARED_CONVERSATION_ID,
          title: messages.length ? summarizeTitle(messages[0].content) : 'Shared chat',
          messages
        })
      ],
      activeConversationId: SHARED_CONVERSATION_ID,
      profileName: legacySender
    };
  }

  const firstConversation = createConversation();
  return {
    conversations: [
      {
        ...firstConversation,
        id: SHARED_CONVERSATION_ID,
        title: 'Shared chat'
      }
    ],
    activeConversationId: SHARED_CONVERSATION_ID,
    profileName
  };
}

export function persistState({ conversations, activeConversationId, profileName }) {
  localStorage.setItem(STORAGE_KEYS.conversations, JSON.stringify(conversations));
  localStorage.setItem(STORAGE_KEYS.activeConversationId, activeConversationId);
  localStorage.setItem(STORAGE_KEYS.profileName, profileName);
}

export function addConversation(conversations, conversation) {
  return [conversation, ...conversations];
}

export function updateConversation(conversations, conversationId, updater) {
  return conversations.map((conversation) => {
    if (conversation.id !== conversationId) {
      return conversation;
    }

    return updater(conversation);
  });
}

export function appendMessage(conversations, conversationId, message) {
  return updateConversation(conversations, conversationId, (conversation) => {
    const nextMessages = [...conversation.messages];
    const lastMessage = nextMessages[nextMessages.length - 1];

    if (
      lastMessage?.pending &&
      lastMessage.sender === message.sender &&
      lastMessage.content === message.content &&
      lastMessage.type === message.type
    ) {
      nextMessages[nextMessages.length - 1] = {
        ...message,
        pending: false
      };
    } else {
      nextMessages.push(message);
    }

    return {
      ...conversation,
      messages: nextMessages,
      updatedAt: message.timestamp || Date.now(),
      typing: message.type === 'BOT_TYPING' ? true : message.type === 'BOT' ? false : conversation.typing,
      title:
        conversation.title === 'New chat' && message.type === 'CHAT'
          ? summarizeTitle(message.content)
          : conversation.title
    };
  });
}

export function setConversationTyping(conversations, conversationId, typing) {
  return updateConversation(conversations, conversationId, (conversation) => ({
    ...conversation,
    typing
  }));
}

export function updateConversationTitle(conversations, conversationId, title) {
  return updateConversation(conversations, conversationId, (conversation) => ({
    ...conversation,
    title
  }));
}

export function removeConversation(conversations, conversationId) {
  return conversations.filter((conversation) => conversation.id !== conversationId);
}

export function getConversationPreview(conversation) {
  const lastMessage = conversation.messages[conversation.messages.length - 1];
  return formatPreview(lastMessage);
}

export function getConversationTime(conversation) {
  const lastMessage = conversation.messages[conversation.messages.length - 1];
  return lastMessage?.timestamp || conversation.updatedAt;
}

export { STORAGE_KEYS, makeId };
