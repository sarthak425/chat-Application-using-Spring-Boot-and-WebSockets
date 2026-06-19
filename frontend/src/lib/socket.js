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
