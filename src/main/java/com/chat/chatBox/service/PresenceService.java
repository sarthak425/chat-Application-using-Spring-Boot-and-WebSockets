package com.chat.chatBox.service;

import com.chat.chatBox.entity.AppUser;
import com.chat.chatBox.repository.AppUserRepository;
import java.time.Instant;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

@Service
public class PresenceService {

    private final AppUserRepository appUserRepository;
    private final ChatMapper chatMapper;
    private final SimpMessagingTemplate messagingTemplate;

    public PresenceService(
            AppUserRepository appUserRepository,
            ChatMapper chatMapper,
            SimpMessagingTemplate messagingTemplate) {
        this.appUserRepository = appUserRepository;
        this.chatMapper = chatMapper;
        this.messagingTemplate = messagingTemplate;
    }

    public void markOnline(AppUser user) {
        user.markOnline();
        user.setLastSeen(Instant.now());
        AppUser saved = appUserRepository.save(user);
        messagingTemplate.convertAndSend("/topic/presence", chatMapper.toUserSummary(saved));
    }

    public void markOffline(AppUser user) {
        user.markOffline();
        AppUser saved = appUserRepository.save(user);
        messagingTemplate.convertAndSend("/topic/presence", chatMapper.toUserSummary(saved));
    }
}
