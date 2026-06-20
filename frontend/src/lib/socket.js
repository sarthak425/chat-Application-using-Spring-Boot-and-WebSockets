import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';

const socketBaseUrl = import.meta.env.VITE_API_BASE_URL || '';

function socketEndpoint() {
  const normalizedBase = socketBaseUrl.replace(/\/$/, '');
  return normalizedBase ? `${normalizedBase}/ws` : '/ws';
}

export function createSocketClient(token, { onConnect, onDisconnect, onError } = {}) {
  const client = new Client({
    webSocketFactory: () => new SockJS(socketEndpoint()),
    reconnectDelay: 3000,
    heartbeatIncoming: 4000,
    heartbeatOutgoing: 4000,
    debug: () => {},
    connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
    onConnect: () => onConnect?.(client),
    onWebSocketClose: () => onDisconnect?.(),
    onStompError: (frame) => onError?.(frame.headers['message'] || 'Socket error')
  });

  client.activate();
  return client;
}

/**
 * ✅ THE FIX: Subscribe to a user's personal message feed.
 * This receives ALL messages across ALL conversations for this user,
 * so User B receives messages even when they don't have the chat open.
 */
export function subscribeToUserMessages(client, userId, onMessage) {
  return client.subscribe(`/topic/users/${userId}/messages`, (frame) => {
    onMessage(JSON.parse(frame.body));
  });
}

export function subscribeToUserPresence(client, userId, onPresence) {
  return client.subscribe(`/topic/users/${userId}/presence`, (frame) => {
    onPresence(JSON.parse(frame.body));
  });
}

export function subscribeToConversation(client, conversationId, onMessage) {
  return client.subscribe(`/topic/conversations/${conversationId}`, (frame) => {
    onMessage(JSON.parse(frame.body));
  });
}

export function subscribeToTyping(client, conversationId, onTyping) {
  return client.subscribe(`/topic/conversations/${conversationId}/typing`, (frame) => {
    onTyping(JSON.parse(frame.body));
  });
}

export function subscribeToInbox(client, userId, onInbox) {
  return client.subscribe(`/topic/users/${userId}/inbox`, (frame) => {
    onInbox(JSON.parse(frame.body));
  });
}

export function subscribeToUserCalls(client, userId, onCall) {
  return client.subscribe(`/topic/users/${userId}/calls`, (frame) => {
    onCall(JSON.parse(frame.body));
  });
}

/** @deprecated Use subscribeToUserPresence for per-user presence instead. */
export function subscribeToPresence(client, onPresence) {
  return client.subscribe('/topic/presence', (frame) => {
    onPresence(JSON.parse(frame.body));
  });
}

export function sendSocketMessage(client, payload) {
  client?.publish({
    destination: '/app/chat.send',
    body: JSON.stringify(payload)
  });
}

export function sendTyping(client, payload) {
  client?.publish({
    destination: '/app/chat.typing',
    body: JSON.stringify(payload)
  });
}

export function sendReadReceipt(client, payload) {
  client?.publish({
    destination: '/app/chat.read',
    body: JSON.stringify(payload)
  });
}

export function sendReaction(client, payload) {
  client?.publish({
    destination: '/app/chat.react',
    body: JSON.stringify(payload)
  });
}

export function sendPin(client, payload) {
  client?.publish({
    destination: '/app/chat.pin',
    body: JSON.stringify(payload)
  });
}

export function sendCallStart(client, payload) {
  client?.publish({
    destination: '/app/chat.call.start',
    body: JSON.stringify(payload)
  });
}

export function sendCallAccept(client, payload) {
  client?.publish({
    destination: '/app/chat.call.accept',
    body: JSON.stringify(payload)
  });
}

export function sendCallSignal(client, payload) {
  client?.publish({
    destination: '/app/chat.call.signal',
    body: JSON.stringify(payload)
  });
}

export function sendCallReject(client, payload) {
  client?.publish({
    destination: '/app/chat.call.reject',
    body: JSON.stringify(payload)
  });
}

export function sendCallEnd(client, payload) {
  client?.publish({
    destination: '/app/chat.call.end',
    body: JSON.stringify(payload)
  });
}
