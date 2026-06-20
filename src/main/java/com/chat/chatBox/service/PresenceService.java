package com.chat.chatBox.service;

import com.chat.chatBox.entity.AppUser;
import com.chat.chatBox.repository.AppUserRepository;
import com.chat.chatBox.repository.ConversationParticipantRepository;
import java.time.Instant;
import java.util.List;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

@Service
public class PresenceService {

    private final AppUserRepository appUserRepository;
    private final ConversationParticipantRepository participantRepository;
    private final ChatMapper chatMapper;
    private final SimpMessagingTemplate messagingTemplate;

    public PresenceService(
            AppUserRepository appUserRepository,
            ConversationParticipantRepository participantRepository,
            ChatMapper chatMapper,
            SimpMessagingTemplate messagingTemplate) {
        this.appUserRepository = appUserRepository;
        this.participantRepository = participantRepository;
        this.chatMapper = chatMapper;
        this.messagingTemplate = messagingTemplate;
    }

    public void markOnline(AppUser user) {
        user.markOnline();
        user.setLastSeen(Instant.now());
        AppUser saved = appUserRepository.save(user);
        broadcastPresence(saved);
    }

    public void markOffline(AppUser user) {
        user.markOffline();
        AppUser saved = appUserRepository.save(user);
        broadcastPresence(saved);
    }

    /**
     * Broadcast presence update to all users who share a conversation with this user.
     * Also broadcast to the global topic for backwards compatibility.
     */
    private void broadcastPresence(AppUser user) {
        var summary = chatMapper.toUserSummary(user);

        // Global presence topic (used by all subscribers)
        messagingTemplate.convertAndSend("/topic/presence", summary);

        // Also send to each contact's personal presence topic
        List<Long> contactIds = participantRepository.findContactUserIds(user.getId());
        for (Long contactId : contactIds) {
            messagingTemplate.convertAndSend("/topic/users/" + contactId + "/presence", summary);
        }
    }
}
