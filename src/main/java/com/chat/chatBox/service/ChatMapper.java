package com.chat.chatBox.service;

import com.chat.chatBox.dto.AuthDtos;
import com.chat.chatBox.dto.ChatDtos;
import com.chat.chatBox.entity.AppUser;
import com.chat.chatBox.entity.ChatConversation;
import com.chat.chatBox.entity.ChatMessage;
import com.chat.chatBox.entity.ConversationParticipant;
import com.chat.chatBox.entity.enums.ConversationType;
import java.time.Instant;
import java.util.Comparator;
import java.util.List;
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
                Objects.equals(message.getSender().getId(), currentUserId));
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
                onlinePeer != null || (conversation.getType() == ConversationType.DIRECT && currentUser.isOnlineStatus()),
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
            case IMAGE -> "Photo";
            case FILE -> "File";
            case AUDIO -> "Voice note";
            case VIDEO -> "Video";
            case SYSTEM -> message.getContent();
            default -> message.getContent();
        };
    }
}
