package com.chat.chatBox.repository;

import com.chat.chatBox.entity.ChatMessage;
import com.chat.chatBox.entity.enums.MessageStatus;
import java.time.Instant;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {
    @EntityGraph(attributePaths = {"sender", "receiver"})
    List<ChatMessage> findByConversationIdOrderByTimestampAsc(Long conversationId);

    @EntityGraph(attributePaths = {"sender", "receiver", "conversation"})
    java.util.Optional<ChatMessage> findTopByConversationIdOrderByTimestampDesc(Long conversationId);

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
}
