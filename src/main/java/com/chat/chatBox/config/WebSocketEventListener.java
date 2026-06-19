package com.chat.chatBox.config;

import com.chat.chatBox.entity.AppUser;
import com.chat.chatBox.repository.AppUserRepository;
import com.chat.chatBox.service.PresenceService;
import java.security.Principal;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionConnectedEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

@Component
public class WebSocketEventListener {

    private final AppUserRepository appUserRepository;
    private final PresenceService presenceService;

    public WebSocketEventListener(AppUserRepository appUserRepository, PresenceService presenceService) {
        this.appUserRepository = appUserRepository;
        this.presenceService = presenceService;
    }

    @EventListener
    public void handleSessionConnected(SessionConnectedEvent event) {
        Principal principal = event.getUser();
        if (principal == null) {
            return;
        }

        appUserRepository.findByEmail(principal.getName()).ifPresent(presenceService::markOnline);
    }

    @EventListener
    public void handleSessionDisconnect(SessionDisconnectEvent event) {
        Principal principal = event.getUser();
        if (principal == null) {
            return;
        }

        appUserRepository.findByEmail(principal.getName()).ifPresent(presenceService::markOffline);
    }
}
