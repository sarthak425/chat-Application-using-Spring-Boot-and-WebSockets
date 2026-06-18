import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';

export function createChatClient({ onConnect, onDisconnect, onError }) {
  const client = new Client({
    webSocketFactory: () => new SockJS('/chat'),
    reconnectDelay: 4000,
    heartbeatIncoming: 4000,
    heartbeatOutgoing: 4000,
    debug: () => {},
    onConnect: () => onConnect?.(client),
    onWebSocketClose: () => onDisconnect?.(),
    onStompError: (frame) => onError?.(frame.headers['message'] || 'Connection error')
  });

  client.activate();
  return client;
}

export function subscribeToConversation(client, conversationId, onMessage) {
  if (!client?.connected) {
    return null;
  }

  return client.subscribe(`/topic/messages/${conversationId}`, (frame) => {
    onMessage(JSON.parse(frame.body));
  });
}

export function sendChatMessage(client, payload) {
  client?.publish({
    destination: '/app/sendMessage',
    body: JSON.stringify(payload)
  });
}

export function registerConversation(client, payload) {
  client?.publish({
    destination: '/app/register',
    body: JSON.stringify(payload)
  });
}
