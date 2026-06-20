package com.chat.chatBox.service;

import com.chat.chatBox.dto.ChatDtos;
import com.chat.chatBox.entity.AppUser;
import com.chat.chatBox.entity.ChatConversation;
import com.chat.chatBox.entity.ChatMessage;
import com.chat.chatBox.entity.MessageReaction;
import com.chat.chatBox.entity.enums.MessageStatus;
import com.chat.chatBox.entity.enums.MessageType;
import com.chat.chatBox.repository.AppUserRepository;
import com.chat.chatBox.repository.ChatMessageRepository;
import com.chat.chatBox.repository.ConversationParticipantRepository;
import com.chat.chatBox.repository.ConversationRepository;
import com.chat.chatBox.repository.MessageReactionRepository;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Objects;
import org.springframework.data.domain.PageRequest;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class MessageService {

    /** Number of messages loaded per page. */
    private static final int PAGE_SIZE = 30;

    private final ChatMessageRepository chatMessageRepository;
    private final ConversationRepository conversationRepository;
    private final ConversationParticipantRepository participantRepository;
    private final AppUserRepository appUserRepository;
    private final MessageReactionRepository reactionRepository;
    private final ConversationService conversationService;
    private final CurrentUserService currentUserService;
    private final ChatMapper chatMapper;
    private final SimpMessagingTemplate messagingTemplate;

    public MessageService(
            ChatMessageRepository chatMessageRepository,
            ConversationRepository conversationRepository,
            ConversationParticipantRepository participantRepository,
            AppUserRepository appUserRepository,
            MessageReactionRepository reactionRepository,
            ConversationService conversationService,
            CurrentUserService currentUserService,
            ChatMapper chatMapper,
            SimpMessagingTemplate messagingTemplate) {
        this.chatMessageRepository = chatMessageRepository;
        this.conversationRepository = conversationRepository;
        this.participantRepository = participantRepository;
        this.appUserRepository = appUserRepository;
        this.reactionRepository = reactionRepository;
        this.conversationService = conversationService;
        this.currentUserService = currentUserService;
        this.chatMapper = chatMapper;
        this.messagingTemplate = messagingTemplate;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Send
    // ─────────────────────────────────────────────────────────────────────────

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

        // Determine initial status: DELIVERED if receiver is online, else SENT
        MessageStatus status = receiver != null && receiver.isOnlineStatus()
                ? MessageStatus.DELIVERED
                : MessageStatus.SENT;

        // Resolve optional reply-to message
        ChatMessage replyTo = null;
        if (request.replyToId() != null) {
            replyTo = chatMessageRepository.findById(request.replyToId()).orElse(null);
        }

        ChatMessage message = ChatMessage.builder()
                .conversation(conversation)
                .sender(sender)
                .receiver(receiver)
                .replyTo(replyTo)
                .content(content)
                .messageType(type)
                .fileUrl(request.fileUrl())
                .status(status)
                .timestamp(Instant.now())
                .deleted(false)
                .reactions(new ArrayList<>())
                .build();

        ChatMessage saved = chatMessageRepository.save(message);
        conversation.setUpdatedAt(Instant.now());
        conversation.setLastMessageAt(saved.getTimestamp());
        conversationRepository.save(conversation);

        ChatDtos.MessageResponse response = chatMapper.toMessageResponse(saved, sender.getId());

        // ✅ THE FIX: broadcast the full message to EVERY participant's personal topic
        // so they receive it regardless of which conversation is currently open.
        broadcastMessageToParticipants(conversation, saved);

        // Also broadcast to the open-conversation topic for live updates in the chat view
        messagingTemplate.convertAndSend("/topic/conversations/" + conversation.getId(), response);

        // Update sidebars for all participants
        broadcastInboxSummaries(conversation, saved);

        return response;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Edit
    // ─────────────────────────────────────────────────────────────────────────

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

        broadcastMessageToParticipants(saved.getConversation(), saved);
        messagingTemplate.convertAndSend("/topic/conversations/" + saved.getConversation().getId(), response);
        broadcastInboxSummaries(saved.getConversation(), saved);
        return response;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Delete for Everyone
    // ─────────────────────────────────────────────────────────────────────────

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

        ChatDtos.MessageResponse response = chatMapper.toMessageResponse(saved, currentUser.getId());
        broadcastMessageToParticipants(saved.getConversation(), saved);
        messagingTemplate.convertAndSend("/topic/conversations/" + saved.getConversation().getId(), response);
        broadcastInboxSummaries(saved.getConversation(), saved);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // List (paginated)
    // ─────────────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<ChatDtos.MessageResponse> listMessages(Long conversationId) {
        AppUser currentUser = currentUserService.requireCurrentUser();
        ChatConversation conversation = conversationService.requireConversation(conversationId);
        ensureParticipant(conversation, currentUser);
        // Load latest PAGE_SIZE messages, reverse to chronological order
        List<ChatMessage> messages = chatMessageRepository.findLatest(
                conversationId, PageRequest.of(0, PAGE_SIZE));
        List<ChatMessage> sorted = new ArrayList<>(messages);
        Collections.reverse(sorted);
        return sorted.stream()
                .filter(m -> !m.isDeleted())
                .map(m -> chatMapper.toMessageResponse(m, currentUser.getId()))
                .toList();
    }

    @Transactional(readOnly = true)
    public ChatDtos.MessagePageResponse listMessagesPaged(Long conversationId, Long beforeId) {
        AppUser currentUser = currentUserService.requireCurrentUser();
        ChatConversation conversation = conversationService.requireConversation(conversationId);
        ensureParticipant(conversation, currentUser);

        Instant before = beforeId != null
                ? chatMessageRepository.findById(beforeId)
                        .map(ChatMessage::getTimestamp)
                        .orElse(Instant.now())
                : Instant.now();

        // Load one extra to detect if there are more pages
        List<ChatMessage> raw = chatMessageRepository.findPageBefore(
                conversationId, before, PageRequest.of(0, PAGE_SIZE + 1));

        boolean hasMore = raw.size() > PAGE_SIZE;
        List<ChatMessage> page = hasMore ? raw.subList(0, PAGE_SIZE) : raw;

        // Reverse so oldest is first in response
        List<ChatMessage> sorted = new ArrayList<>(page);
        Collections.reverse(sorted);

        List<ChatDtos.MessageResponse> responses = sorted.stream()
                .map(m -> chatMapper.toMessageResponse(m, currentUser.getId()))
                .toList();

        Long oldestId = responses.isEmpty() ? null : responses.get(0).id();
        return new ChatDtos.MessagePageResponse(responses, hasMore, oldestId);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Mark Read
    // ─────────────────────────────────────────────────────────────────────────

    @Transactional
    public void markRead(Long conversationId) {
        AppUser currentUser = currentUserService.requireCurrentUser();
        ChatConversation conversation = conversationService.requireConversation(conversationId);
        ensureParticipant(conversation, currentUser);

        Instant now = Instant.now();
        conversationService.markRead(conversationId);

        // Bulk update — much more efficient than looping
        int updated = chatMessageRepository.updateConversationStatuses(
                conversationId, currentUser.getId(), MessageStatus.READ, now);

        if (updated > 0) {
            // Notify the sender(s) that their messages were read
            // We reload messages to push updated read receipts back via WS
            List<ChatMessage> messages = chatMessageRepository.findByConversationIdOrderByTimestampAsc(conversationId);
            for (ChatMessage message : messages) {
                if (!Objects.equals(message.getSender().getId(), currentUser.getId())
                        && !message.isDeleted()
                        && message.getStatus() == MessageStatus.READ) {
                    ChatDtos.MessageResponse response = chatMapper.toMessageResponse(message, currentUser.getId());
                    // Notify the sender their message was read
                    messagingTemplate.convertAndSend(
                            "/topic/users/" + message.getSender().getId() + "/messages", response);
                    messagingTemplate.convertAndSend(
                            "/topic/conversations/" + conversationId, response);
                }
            }
        }

        broadcastInboxSummaries(conversation, null);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Typing
    // ─────────────────────────────────────────────────────────────────────────

    @Transactional
    public void typing(Long conversationId, boolean typing) {
        AppUser currentUser = currentUserService.requireCurrentUser();
        ChatConversation conversation = conversationService.requireConversation(conversationId);
        ensureParticipant(conversation, currentUser);
        messagingTemplate.convertAndSend(
                "/topic/conversations/" + conversationId + "/typing",
                new TypingPayload(currentUser.getId(), currentUser.getUsername(), typing));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // React
    // ─────────────────────────────────────────────────────────────────────────

    @Transactional
    public ChatDtos.MessageResponse reactToMessage(Long messageId, String emoji) {
        AppUser currentUser = currentUserService.requireCurrentUser();
        ChatMessage message = requireMessage(messageId);
        ensureParticipant(message.getConversation(), currentUser);

        // Toggle: if already reacted with same emoji, remove; otherwise add/replace
        int deleted = reactionRepository.deleteByMessageIdAndUserId(messageId, currentUser.getId());
        if (deleted == 0 || !emoji.equals(getExistingEmoji(messageId, currentUser.getId()))) {
            // Add new reaction
            MessageReaction reaction = MessageReaction.builder()
                    .message(message)
                    .user(currentUser)
                    .emoji(emoji)
                    .createdAt(Instant.now())
                    .build();
            reactionRepository.save(reaction);
        }

        // Reload to get fresh reactions list
        ChatMessage refreshed = requireMessage(messageId);
        ChatDtos.MessageResponse response = chatMapper.toMessageResponse(refreshed, currentUser.getId());

        broadcastMessageToParticipants(message.getConversation(), refreshed);
        messagingTemplate.convertAndSend("/topic/conversations/" + message.getConversation().getId(), response);
        return response;
    }

    private String getExistingEmoji(Long messageId, Long userId) {
        return reactionRepository.findByMessageIdAndUserId(messageId, userId)
                .map(MessageReaction::getEmoji)
                .orElse(null);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Pin
    // ─────────────────────────────────────────────────────────────────────────

    @Transactional
    public ChatDtos.MessageResponse pinMessage(Long messageId, boolean pin) {
        AppUser currentUser = currentUserService.requireCurrentUser();
        ChatMessage message = requireMessage(messageId);
        ensureParticipant(message.getConversation(), currentUser);

        message.setPinnedAt(pin ? Instant.now() : null);
        ChatMessage saved = chatMessageRepository.save(message);
        ChatDtos.MessageResponse response = chatMapper.toMessageResponse(saved, currentUser.getId());

        broadcastMessageToParticipants(message.getConversation(), saved);
        messagingTemplate.convertAndSend("/topic/conversations/" + message.getConversation().getId(), response);
        return response;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Private helpers
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * ✅ THE FIX: Push the full MessageResponse to every participant's personal
     * user topic so they receive it regardless of which conversation is open.
     * Previously, only a conversation-level topic was used, meaning User B would
     * miss messages when their conversation panel was not subscribed.
     */
    private void broadcastMessageToParticipants(ChatConversation conversation, ChatMessage message) {
        for (var participant : conversation.getParticipants()) {
            AppUser user = participant.getUser();
            ChatDtos.MessageResponse response = chatMapper.toMessageResponse(message, user.getId());
            messagingTemplate.convertAndSend("/topic/users/" + user.getId() + "/messages", response);
        }
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
            return appUserRepository.findById(receiverId).orElse(null);
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
