package com.chat.chatBox.config;

import com.chat.chatBox.service.ChatMessageFactory;
import com.chat.chatBox.service.ChatSessionService;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

@Component
public class WebSocketEventListener {

    private final ChatSessionService chatSessionService;
    private final ChatMessageFactory chatMessageFactory;
    private final SimpMessagingTemplate messagingTemplate;

    public WebSocketEventListener(
            ChatSessionService chatSessionService,
            ChatMessageFactory chatMessageFactory,
            SimpMessagingTemplate messagingTemplate) {
        this.chatSessionService = chatSessionService;
        this.chatMessageFactory = chatMessageFactory;
        this.messagingTemplate = messagingTemplate;
    }

    @EventListener
    public void handleSessionDisconnect(SessionDisconnectEvent event) {
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(event.getMessage());
        String sessionId = accessor.getSessionId();
        if (sessionId == null) {
            return;
        }

        chatSessionService.removeUser(sessionId)
                .ifPresent(sender -> messagingTemplate.convertAndSend(
                        "/topic/messages",
                        chatMessageFactory.systemMessage(sessionId, sender + " left the chat")));
    }
}
