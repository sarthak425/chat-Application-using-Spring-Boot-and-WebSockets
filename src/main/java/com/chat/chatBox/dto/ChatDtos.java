package com.chat.chatBox.dto;

import com.chat.chatBox.entity.enums.ConversationType;
import com.chat.chatBox.entity.enums.MessageStatus;
import com.chat.chatBox.entity.enums.MessageType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;
import java.util.List;

public final class ChatDtos {
    private ChatDtos() {
    }

    // ── Requests ────────────────────────────────────────────────────────────

    public record CreateConversationRequest(
            @NotNull Long participantId,
            String name
    ) {
    }

    public record CreateGroupRequest(
            @NotBlank String name,
            String avatarUrl,
            List<Long> participantIds
    ) {
    }

    public record SendMessageRequest(
            Long conversationId,
            Long receiverId,
            String content,
            MessageType messageType,
            String fileUrl,
            Long replyToId
    ) {
    }

    public record TypingEventRequest(
            @NotNull Long conversationId,
            boolean typing
    ) {
    }

    public record ReadReceiptRequest(
            @NotNull Long conversationId
    ) {
    }

    public record ReactMessageRequest(
            @NotNull Long messageId,
            @NotNull String emoji
    ) {
    }

    public record PinMessageRequest(
            @NotNull Long messageId,
            boolean pin
    ) {
    }

    public record EditMessageRequest(
            @NotBlank String content
    ) {
    }

    // ── Responses ───────────────────────────────────────────────────────────

    /** Grouped emoji reaction summary: emoji → list of usernames who reacted. */
    public record ReactionSummary(
            String emoji,
            long count,
            List<String> usernames,
            boolean mine
    ) {
    }

    /** Lightweight reply preview embedded inside MessageResponse. */
    public record ReplyPreview(
            Long id,
            Long senderId,
            String senderName,
            String content,
            MessageType messageType
    ) {
    }

    public record MessageResponse(
            Long id,
            Long conversationId,
            Long senderId,
            Long receiverId,
            String senderName,
            String senderImage,
            String content,
            MessageType messageType,
            String fileUrl,
            MessageStatus status,
            Instant timestamp,
            Instant editedAt,
            Instant readAt,
            Instant pinnedAt,
            boolean mine,
            boolean deleted,
            ReplyPreview replyTo,
            List<ReactionSummary> reactions
    ) {
    }

    public record MessagePageResponse(
            List<MessageResponse> messages,
            boolean hasMore,
            Long oldestId
    ) {
    }

    public record ConversationSummaryResponse(
            Long id,
            String conversationKey,
            ConversationType type,
            String name,
            String avatarUrl,
            boolean online,
            String lastMessagePreview,
            Instant lastMessageAt,
            long unreadCount,
            List<UserSummaryResponse> participants
    ) {
    }

    public record UserSummaryResponse(
            Long id,
            String username,
            String email,
            String profileImage,
            boolean onlineStatus,
            Instant lastSeen
    ) {
    }

    public record ConversationDetailResponse(
            ConversationSummaryResponse conversation,
            List<MessageResponse> messages
    ) {
    }

    public record UploadResponse(
            String fileUrl,
            String fileName,
            String contentType
    ) {
    }
}
