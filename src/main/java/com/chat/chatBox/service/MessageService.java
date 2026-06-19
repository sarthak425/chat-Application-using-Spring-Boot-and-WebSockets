package com.chat.chatBox.service;

import com.chat.chatBox.dto.ChatDtos;
import com.chat.chatBox.entity.AppUser;
import com.chat.chatBox.entity.ChatConversation;
import com.chat.chatBox.entity.ChatMessage;
import com.chat.chatBox.entity.enums.MessageStatus;
import com.chat.chatBox.entity.enums.MessageType;
import com.chat.chatBox.repository.AppUserRepository;
import com.chat.chatBox.repository.ChatMessageRepository;
import com.chat.chatBox.repository.ConversationParticipantRepository;
import com.chat.chatBox.repository.ConversationRepository;
import java.time.Instant;
import java.util.List;
import java.util.Objects;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class MessageService {

    private final ChatMessageRepository chatMessageRepository;
    private final ConversationRepository conversationRepository;
    private final ConversationParticipantRepository participantRepository;
    private final AppUserRepository appUserRepository;
    private final ConversationService conversationService;
    private final CurrentUserService currentUserService;
    private final ChatMapper chatMapper;
    private final SimpMessagingTemplate messagingTemplate;

    public MessageService(
            ChatMessageRepository chatMessageRepository,
            ConversationRepository conversationRepository,
            ConversationParticipantRepository participantRepository,
            AppUserRepository appUserRepository,
            ConversationService conversationService,
            CurrentUserService currentUserService,
            ChatMapper chatMapper,
            SimpMessagingTemplate messagingTemplate) {
        this.chatMessageRepository = chatMessageRepository;
        this.conversationRepository = conversationRepository;
        this.participantRepository = participantRepository;
        this.appUserRepository = appUserRepository;
        this.conversationService = conversationService;
        this.currentUserService = currentUserService;
        this.chatMapper = chatMapper;
        this.messagingTemplate = messagingTemplate;
    }

    @Transactional
    public ChatDtos.MessageResponse sendMessage(ChatDtos.SendMessageRequest request) {
        AppUser sender = currentUserService.requireCurrentUser();
        ChatConversation conversation = resolveConversation(request);
        ensureParticipant(conversation, sender);

        AppUser receiver = resolveReceiver(conversation, sender, request.receiverId());
        MessageType type = request.messageType() != null
                ? request.messageType()
                : (request.fileUrl() != null && !request.fileUrl().isBlank() ? MessageType.FILE : MessageType.TEXT);
        String content = request.content() == null ? "" : request.content().trim();

        MessageStatus status = receiver != null && receiver.isOnlineStatus()
                ? MessageStatus.DELIVERED
                : MessageStatus.SENT;

        ChatMessage message = ChatMessage.builder()
                .conversation(conversation)
                .sender(sender)
                .receiver(receiver)
                .content(content)
                .messageType(type)
                .fileUrl(request.fileUrl())
                .status(status)
                .timestamp(Instant.now())
                .deleted(false)
                .build();

        ChatMessage saved = chatMessageRepository.save(message);
        conversation.setUpdatedAt(Instant.now());
        conversation.setLastMessageAt(saved.getTimestamp());
        conversationRepository.save(conversation);

        ChatDtos.MessageResponse response = chatMapper.toMessageResponse(saved, sender.getId());
        messagingTemplate.convertAndSend("/topic/conversations/" + conversation.getId(), response);
        broadcastInboxSummaries(conversation, saved);
        return response;
    }

    @Transactional
    public ChatDtos.MessageResponse editMessage(Long messageId, String content) {
        AppUser currentUser = currentUserService.requireCurrentUser();
        ChatMessage message = requireMessage(messageId);
        if (!Objects.equals(message.getSender().getId(), currentUser.getId())) {
            throw new IllegalArgumentException("You can only edit your own messages");
        }

        message.setContent(content == null ? "" : content.trim());
        message.setEditedAt(Instant.now());
        ChatMessage saved = chatMessageRepository.save(message);
        ChatDtos.MessageResponse response = chatMapper.toMessageResponse(saved, currentUser.getId());
        messagingTemplate.convertAndSend("/topic/conversations/" + saved.getConversation().getId(), response);
        broadcastInboxSummaries(saved.getConversation(), saved);
        return response;
    }

    @Transactional
    public void deleteMessage(Long messageId) {
        AppUser currentUser = currentUserService.requireCurrentUser();
        ChatMessage message = requireMessage(messageId);
        if (!Objects.equals(message.getSender().getId(), currentUser.getId())) {
            throw new IllegalArgumentException("You can only delete your own messages");
        }

        message.setDeleted(true);
        message.setDeletedAt(Instant.now());
        message.setContent("");
        ChatMessage saved = chatMessageRepository.save(message);
        messagingTemplate.convertAndSend("/topic/conversations/" + saved.getConversation().getId(), chatMapper.toMessageResponse(saved, currentUser.getId()));
        broadcastInboxSummaries(saved.getConversation(), saved);
    }

    @Transactional(readOnly = true)
    public List<ChatDtos.MessageResponse> listMessages(Long conversationId) {
        AppUser currentUser = currentUserService.requireCurrentUser();
        ChatConversation conversation = conversationService.requireConversation(conversationId);
        ensureParticipant(conversation, currentUser);
        return chatMessageRepository.findByConversationIdOrderByTimestampAsc(conversationId).stream()
                .filter(message -> !message.isDeleted())
                .map(message -> chatMapper.toMessageResponse(message, currentUser.getId()))
                .toList();
    }

    @Transactional
    public void markRead(Long conversationId) {
        AppUser currentUser = currentUserService.requireCurrentUser();
        ChatConversation conversation = conversationService.requireConversation(conversationId);
        ensureParticipant(conversation, currentUser);
        conversationService.markRead(conversationId);
        List<ChatMessage> messages = chatMessageRepository.findByConversationIdOrderByTimestampAsc(conversationId);
        for (ChatMessage message : messages) {
            if (!Objects.equals(message.getSender().getId(), currentUser.getId()) && !message.isDeleted()) {
                message.setStatus(MessageStatus.READ);
                message.setReadAt(Instant.now());
                chatMessageRepository.save(message);
                messagingTemplate.convertAndSend("/topic/conversations/" + conversationId, chatMapper.toMessageResponse(message, currentUser.getId()));
            }
        }
        broadcastInboxSummaries(conversation, null);
    }

    @Transactional
    public void typing(Long conversationId, boolean typing) {
        AppUser currentUser = currentUserService.requireCurrentUser();
        ChatConversation conversation = conversationService.requireConversation(conversationId);
        ensureParticipant(conversation, currentUser);
        messagingTemplate.convertAndSend("/topic/conversations/" + conversationId + "/typing", new TypingPayload(currentUser.getId(), currentUser.getUsername(), typing));
    }

    private void broadcastInboxSummaries(ChatConversation conversation, ChatMessage latestMessage) {
        for (var participant : conversation.getParticipants()) {
            AppUser user = participant.getUser();
            long unreadCount = conversationService.unreadCountForUser(conversation, user);
            String preview = latestMessage == null ? "No messages yet" : chatMapper.previewFromConversation(latestMessage);
            ChatDtos.ConversationSummaryResponse summary = chatMapper.toConversationSummary(
                    conversation,
                    user,
                    unreadCount,
                    preview);
            messagingTemplate.convertAndSend("/topic/users/" + user.getId() + "/inbox", summary);
        }
    }

    private ChatConversation resolveConversation(ChatDtos.SendMessageRequest request) {
        if (request.conversationId() != null) {
            return conversationService.requireConversation(request.conversationId());
        }

        if (request.receiverId() == null) {
            throw new IllegalArgumentException("Either conversationId or receiverId is required");
        }

        return conversationService.getOrCreateDirectConversation(request.receiverId());
    }

    private AppUser resolveReceiver(ChatConversation conversation, AppUser sender, Long receiverId) {
        if (conversation.getType() == com.chat.chatBox.entity.enums.ConversationType.GROUP) {
            return null;
        }

        if (receiverId != null) {
            return appUserRepository.findById(receiverId)
                    .orElse(null);
        }

        return conversation.getParticipants().stream()
                .map(participant -> participant.getUser())
                .filter(user -> !Objects.equals(user.getId(), sender.getId()))
                .findFirst()
                .orElse(null);
    }

    private void ensureParticipant(ChatConversation conversation, AppUser user) {
        boolean allowed = conversation.getParticipants().stream()
                .anyMatch(participant -> participant.getUser().getId().equals(user.getId()));
        if (!allowed) {
            throw new IllegalArgumentException("You are not part of this conversation");
        }
    }

    private ChatMessage requireMessage(Long messageId) {
        return chatMessageRepository.findById(messageId)
                .orElseThrow(() -> new IllegalArgumentException("Message not found"));
    }

    public record TypingPayload(Long userId, String username, boolean typing) {
    }
}
