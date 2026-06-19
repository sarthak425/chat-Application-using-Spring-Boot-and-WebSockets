package com.chat.chatBox.config;

import com.chat.chatBox.service.ChatSessionService;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

@Component
public class WebSocketEventListener {

    private final ChatSessionService chatSessionService;

    public WebSocketEventListener(ChatSessionService chatSessionService) {
        this.chatSessionService = chatSessionService;
    }

    @EventListener
    public void handleSessionDisconnect(SessionDisconnectEvent event) {
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(event.getMessage());
        String sessionId = accessor.getSessionId();
        if (sessionId == null) {
            return;
        }

        chatSessionService.removeUser(sessionId);
    }
}
