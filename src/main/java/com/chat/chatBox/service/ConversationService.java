package com.chat.chatBox.service;

import com.chat.chatBox.dto.ChatDtos;
import com.chat.chatBox.entity.AppUser;
import com.chat.chatBox.entity.ChatConversation;
import com.chat.chatBox.entity.ChatMessage;
import com.chat.chatBox.entity.ConversationParticipant;
import com.chat.chatBox.entity.enums.ConversationType;
import com.chat.chatBox.repository.AppUserRepository;
import com.chat.chatBox.repository.ChatMessageRepository;
import com.chat.chatBox.repository.ConversationParticipantRepository;
import com.chat.chatBox.repository.ConversationRepository;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ConversationService {

    private final ConversationRepository conversationRepository;
    private final ConversationParticipantRepository participantRepository;
    private final ChatMessageRepository chatMessageRepository;
    private final AppUserRepository appUserRepository;
    private final CurrentUserService currentUserService;
    private final ChatMapper chatMapper;

    public ConversationService(
            ConversationRepository conversationRepository,
            ConversationParticipantRepository participantRepository,
            ChatMessageRepository chatMessageRepository,
            AppUserRepository appUserRepository,
            CurrentUserService currentUserService,
            ChatMapper chatMapper) {
        this.conversationRepository = conversationRepository;
        this.participantRepository = participantRepository;
        this.chatMessageRepository = chatMessageRepository;
        this.appUserRepository = appUserRepository;
        this.currentUserService = currentUserService;
        this.chatMapper = chatMapper;
    }

    @Transactional(readOnly = true)
    public List<ChatDtos.ConversationSummaryResponse> listConversations() {
        AppUser currentUser = currentUserService.requireCurrentUser();
        return conversationRepository.findAllForUser(currentUser.getId()).stream()
                .map(conversation -> {
                    // findTopByConversationIdOrderByTimestampDesc uses EntityGraph — avoids N+1
                    String preview = chatMessageRepository
                            .findTopByConversationIdOrderByTimestampDesc(conversation.getId())
                            .map(chatMapper::previewFromConversation)
                            .orElse("No messages yet");
                    return chatMapper.toConversationSummary(
                            conversation,
                            currentUser,
                            unreadCount(conversation, currentUser),
                            preview);
                })
                .toList();
    }

    @Transactional(readOnly = true)
    public ChatDtos.ConversationDetailResponse getConversation(Long conversationId) {
        AppUser currentUser = currentUserService.requireCurrentUser();
        ChatConversation conversation = requireConversation(conversationId);
        ensureParticipant(conversation, currentUser);
        List<ChatMessage> messages = chatMessageRepository.findByConversationIdOrderByTimestampAsc(conversationId);
        return chatMapper.toConversationDetail(
                conversation,
                currentUser,
                messages,
                unreadCount(conversation, currentUser));
    }

    @Transactional
    public ChatConversation getOrCreateDirectConversation(Long participantId) {
        AppUser currentUser = currentUserService.requireCurrentUser();
        AppUser otherUser = appUserRepository.findById(participantId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        String conversationKey = chatMapper.resolveConversationKey(currentUser.getId(), otherUser.getId());
        return conversationRepository.findWithParticipantsByConversationKey(conversationKey)
                .orElseGet(() -> createDirectConversation(currentUser, otherUser, conversationKey));
    }

    @Transactional
    public ChatConversation createGroupConversation(String name, String avatarUrl, List<Long> participantIds) {
        AppUser currentUser = currentUserService.requireCurrentUser();
        ChatConversation conversation = ChatConversation.builder()
                .conversationKey("group:" + System.currentTimeMillis() + ":" + currentUser.getId())
                .type(ConversationType.GROUP)
                .name(name == null || name.isBlank() ? "Group chat" : name.trim())
                .avatarUrl(avatarUrl)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .lastMessageAt(Instant.now())
                .build();

        List<ConversationParticipant> participants = new ArrayList<>();
        participants.add(newParticipant(conversation, currentUser));
        if (participantIds != null) {
            for (Long participantId : participantIds) {
                if (participantId == null || participantId.equals(currentUser.getId())) {
                    continue;
                }
                appUserRepository.findById(participantId)
                        .ifPresent(user -> participants.add(newParticipant(conversation, user)));
            }
        }
        conversation.setParticipants(participants);
        return conversationRepository.save(conversation);
    }

    @Transactional
    public ChatDtos.ConversationSummaryResponse updateGroup(Long conversationId, String name, String avatarUrl) {
        AppUser currentUser = currentUserService.requireCurrentUser();
        ChatConversation conversation = requireConversation(conversationId);
        ensureParticipant(conversation, currentUser);

        if (conversation.getType() != ConversationType.GROUP) {
            throw new IllegalArgumentException("Only group conversations can be updated");
        }

        if (name != null && !name.isBlank()) {
            conversation.setName(name.trim());
        }
        if (avatarUrl != null) {
            conversation.setAvatarUrl(avatarUrl);
        }
        conversation.setUpdatedAt(Instant.now());
        ChatConversation saved = conversationRepository.save(conversation);

        String preview = chatMessageRepository
                .findTopByConversationIdOrderByTimestampDesc(conversationId)
                .map(chatMapper::previewFromConversation)
                .orElse("No messages yet");
        return chatMapper.toConversationSummary(saved, currentUser, unreadCount(saved, currentUser), preview);
    }

    @Transactional
    public void markRead(Long conversationId) {
        AppUser currentUser = currentUserService.requireCurrentUser();
        ChatConversation conversation = requireConversation(conversationId);
        ensureParticipant(conversation, currentUser);

        Instant now = Instant.now();
        participantRepository.findByConversationIdAndUserId(conversationId, currentUser.getId())
                .ifPresent(participant -> {
                    participant.setLastReadAt(now);
                    participantRepository.save(participant);
                });

        chatMessageRepository.updateConversationStatuses(
                conversationId, currentUser.getId(), com.chat.chatBox.entity.enums.MessageStatus.READ, now);
    }

    @Transactional(readOnly = true)
    public long unreadCountForUser(ChatConversation conversation, AppUser user) {
        ConversationParticipant participant = participantRepository
                .findByConversationIdAndUserId(conversation.getId(), user.getId())
                .orElse(null);
        Instant since = participant != null && participant.getLastReadAt() != null
                ? participant.getLastReadAt()
                : Instant.EPOCH;
        return chatMessageRepository.countUnreadMessages(conversation.getId(), user.getId(), since);
    }

    @Transactional(readOnly = true)
    public ChatConversation requireConversation(Long conversationId) {
        return conversationRepository.findWithParticipantsById(conversationId)
                .orElseThrow(() -> new IllegalArgumentException("Conversation not found"));
    }

    private ChatConversation createDirectConversation(AppUser currentUser, AppUser otherUser, String conversationKey) {
        ChatConversation conversation = ChatConversation.builder()
                .conversationKey(conversationKey)
                .type(ConversationType.DIRECT)
                .name(otherUser.getUsername())
                .avatarUrl(otherUser.getProfileImage())
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .lastMessageAt(Instant.now())
                .build();

        conversation.setParticipants(new ArrayList<>(List.of(
                newParticipant(conversation, currentUser),
                newParticipant(conversation, otherUser))));

        return conversationRepository.save(conversation);
    }

    private ConversationParticipant newParticipant(ChatConversation conversation, AppUser user) {
        return ConversationParticipant.builder()
                .conversation(conversation)
                .user(user)
                .joinedAt(Instant.now())
                .lastReadAt(Instant.EPOCH)
                .build();
    }

    private void ensureParticipant(ChatConversation conversation, AppUser user) {
        boolean allowed = conversation.getParticipants().stream()
                .anyMatch(participant -> participant.getUser().getId().equals(user.getId()));
        if (!allowed) {
            throw new IllegalArgumentException("You are not part of this conversation");
        }
    }

    private long unreadCount(ChatConversation conversation, AppUser user) {
        return unreadCountForUser(conversation, user);
    }
}
