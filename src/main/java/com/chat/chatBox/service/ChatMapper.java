package com.chat.chatBox.service;

import com.chat.chatBox.dto.AuthDtos;
import com.chat.chatBox.dto.ChatDtos;
import com.chat.chatBox.entity.AppUser;
import com.chat.chatBox.entity.ChatConversation;
import com.chat.chatBox.entity.ChatMessage;
import com.chat.chatBox.entity.ConversationParticipant;
import com.chat.chatBox.entity.MessageReaction;
import com.chat.chatBox.entity.enums.ConversationType;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;
import org.springframework.stereotype.Component;

@Component
public class ChatMapper {

    public AuthDtos.UserResponse toUserResponse(AppUser user) {
        return new AuthDtos.UserResponse(
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                user.getProfileImage(),
                user.isOnlineStatus(),
                user.getLastSeen(),
                user.getCreatedAt());
    }

    public ChatDtos.UserSummaryResponse toUserSummary(AppUser user) {
        return new ChatDtos.UserSummaryResponse(
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                user.getProfileImage(),
                user.isOnlineStatus(),
                user.getLastSeen());
    }

    /**
     * Build a lightweight ReplyPreview from the parent message.
     * Returns null if replyTo is null.
     */
    public ChatDtos.ReplyPreview toReplyPreview(ChatMessage message) {
        if (message == null) {
            return null;
        }
        String content = message.isDeleted()
                ? "This message was deleted"
                : (message.getContent() == null ? "" : message.getContent());
        return new ChatDtos.ReplyPreview(
                message.getId(),
                message.getSender().getId(),
                message.getSender().getUsername(),
                content,
                message.getMessageType());
    }

    /**
     * Group reactions by emoji, aggregating usernames and count.
     */
    public List<ChatDtos.ReactionSummary> toReactionSummaries(List<MessageReaction> reactions, Long currentUserId) {
        if (reactions == null || reactions.isEmpty()) {
            return List.of();
        }

        Map<String, List<MessageReaction>> byEmoji = new LinkedHashMap<>();
        for (MessageReaction reaction : reactions) {
            byEmoji.computeIfAbsent(reaction.getEmoji(), k -> new ArrayList<>()).add(reaction);
        }

        return byEmoji.entrySet().stream().map(entry -> {
            String emoji = entry.getKey();
            List<MessageReaction> group = entry.getValue();
            List<String> usernames = group.stream()
                    .map(r -> r.getUser().getUsername())
                    .collect(Collectors.toList());
            boolean mine = group.stream().anyMatch(r -> Objects.equals(r.getUser().getId(), currentUserId));
            return new ChatDtos.ReactionSummary(emoji, group.size(), usernames, mine);
        }).collect(Collectors.toList());
    }

    public ChatDtos.MessageResponse toMessageResponse(ChatMessage message, Long currentUserId) {
        return new ChatDtos.MessageResponse(
                message.getId(),
                message.getConversation().getId(),
                message.getSender().getId(),
                message.getReceiver() == null ? null : message.getReceiver().getId(),
                message.getSender().getUsername(),
                message.getSender().getProfileImage(),
                message.isDeleted() ? "This message was deleted" : message.getContent(),
                message.getMessageType(),
                message.getFileUrl(),
                message.getStatus(),
                message.getTimestamp(),
                message.getEditedAt(),
                message.getReadAt(),
                message.getPinnedAt(),
                Objects.equals(message.getSender().getId(), currentUserId),
                message.isDeleted(),
                toReplyPreview(message.getReplyTo()),
                toReactionSummaries(message.getReactions(), currentUserId));
    }

    public ChatDtos.ConversationSummaryResponse toConversationSummary(
            ChatConversation conversation,
            AppUser currentUser,
            long unreadCount,
            String lastMessagePreview) {
        List<ChatDtos.UserSummaryResponse> participants = conversation.getParticipants().stream()
                .map(ConversationParticipant::getUser)
                .map(this::toUserSummary)
                .collect(Collectors.toList());

        AppUser onlinePeer = conversation.getParticipants().stream()
                .map(ConversationParticipant::getUser)
                .filter(user -> !Objects.equals(user.getId(), currentUser.getId()))
                .filter(AppUser::isOnlineStatus)
                .findFirst()
                .orElse(null);

        String name = resolveConversationName(conversation, currentUser);
        String avatar = resolveConversationAvatar(conversation, currentUser);

        return new ChatDtos.ConversationSummaryResponse(
                conversation.getId(),
                conversation.getConversationKey(),
                conversation.getType(),
                name,
                avatar,
                onlinePeer != null,
                lastMessagePreview,
                conversation.getLastMessageAt(),
                unreadCount,
                participants);
    }

    public ChatDtos.ConversationDetailResponse toConversationDetail(
            ChatConversation conversation,
            AppUser currentUser,
            List<ChatMessage> messages,
            long unreadCount) {
        String lastMessagePreview = messages.isEmpty() ? "No messages yet" : previewFromConversation(messages.get(messages.size() - 1));
        return new ChatDtos.ConversationDetailResponse(
                toConversationSummary(conversation, currentUser, unreadCount, lastMessagePreview),
                messages.stream()
                        .filter(message -> !message.isDeleted())
                        .map(message -> toMessageResponse(message, currentUser.getId()))
                        .toList());
    }

    public String resolveConversationKey(Long userA, Long userB) {
        long first = Math.min(userA, userB);
        long second = Math.max(userA, userB);
        return "direct:" + first + ":" + second;
    }

    public String resolveConversationName(ChatConversation conversation, AppUser currentUser) {
        if (conversation.getType() == ConversationType.GROUP) {
            return conversation.getName();
        }

        return conversation.getParticipants().stream()
                .map(ConversationParticipant::getUser)
                .filter(user -> !Objects.equals(user.getId(), currentUser.getId()))
                .map(AppUser::getUsername)
                .findFirst()
                .orElse(conversation.getName() != null ? conversation.getName() : "Chat");
    }

    public String resolveConversationAvatar(ChatConversation conversation, AppUser currentUser) {
        if (conversation.getAvatarUrl() != null && !conversation.getAvatarUrl().isBlank()) {
            return conversation.getAvatarUrl();
        }

        return conversation.getParticipants().stream()
                .map(ConversationParticipant::getUser)
                .filter(user -> !Objects.equals(user.getId(), currentUser.getId()))
                .map(AppUser::getProfileImage)
                .filter(image -> image != null && !image.isBlank())
                .findFirst()
                .orElse(null);
    }

    public String previewFromConversation(ChatMessage message) {
        if (message == null) {
            return "No messages yet";
        }

        if (message.isDeleted()) {
            return "This message was deleted";
        }

        if (message.getMessageType() == null) {
            return message.getContent();
        }

        return switch (message.getMessageType()) {
            case IMAGE -> "📷 Photo";
            case FILE -> "📎 File";
            case AUDIO -> "🎤 Voice note";
            case VIDEO -> "🎬 Video";
            case SYSTEM -> message.getContent();
            default -> message.getContent();
        };
    }
}
