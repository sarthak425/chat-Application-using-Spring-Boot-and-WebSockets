package com.chat.chatBox.repository;

import com.chat.chatBox.entity.ChatMessage;
import com.chat.chatBox.entity.enums.MessageStatus;
import java.time.Instant;
import java.util.List;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {

    @EntityGraph(attributePaths = {"sender", "receiver", "replyTo", "replyTo.sender", "reactions", "reactions.user"})
    List<ChatMessage> findByConversationIdOrderByTimestampAsc(Long conversationId);

    @EntityGraph(attributePaths = {"sender", "receiver", "conversation"})
    java.util.Optional<ChatMessage> findTopByConversationIdOrderByTimestampDesc(Long conversationId);

    /**
     * Cursor-based pagination: load messages older than the given timestamp (exclusive),
     * ordered newest-first so Pageable.limit() takes the most recent N before the cursor.
     */
    @EntityGraph(attributePaths = {"sender", "receiver", "replyTo", "replyTo.sender", "reactions", "reactions.user"})
    @Query("""
            select m from ChatMessage m
            where m.conversation.id = :conversationId
              and m.timestamp < :before
            order by m.timestamp desc
            """)
    List<ChatMessage> findPageBefore(
            @Param("conversationId") Long conversationId,
            @Param("before") Instant before,
            Pageable pageable);

    /**
     * Initial load: latest N messages in a conversation, newest-first (caller reverses for display).
     */
    @EntityGraph(attributePaths = {"sender", "receiver", "replyTo", "replyTo.sender", "reactions", "reactions.user"})
    @Query("""
            select m from ChatMessage m
            where m.conversation.id = :conversationId
            order by m.timestamp desc
            """)
    List<ChatMessage> findLatest(@Param("conversationId") Long conversationId, Pageable pageable);

    @Query("""
            select count(m)
            from ChatMessage m
            where m.conversation.id = :conversationId
              and m.sender.id <> :userId
              and m.timestamp > :after
              and m.deleted = false
              and m.status <> com.chat.chatBox.entity.enums.MessageStatus.READ
            """)
    long countUnreadMessages(@Param("conversationId") Long conversationId,
                             @Param("userId") Long userId,
                             @Param("after") Instant after);

    @Modifying
    @Query("""
            update ChatMessage m
            set m.status = :status,
                m.readAt = :readAt
            where m.conversation.id = :conversationId
              and m.sender.id <> :userId
              and m.deleted = false
              and m.status <> :status
            """)
    int updateConversationStatuses(@Param("conversationId") Long conversationId,
                                   @Param("userId") Long userId,
                                   @Param("status") MessageStatus status,
                                   @Param("readAt") Instant readAt);

    @Query("""
            select m from ChatMessage m
            where m.conversation.id = :conversationId
              and m.pinnedAt is not null
              and m.deleted = false
            order by m.pinnedAt desc
            """)
    List<ChatMessage> findPinnedByConversationId(@Param("conversationId") Long conversationId);
}
