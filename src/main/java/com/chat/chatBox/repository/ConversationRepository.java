package com.chat.chatBox.repository;

import com.chat.chatBox.entity.ChatConversation;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ConversationRepository extends JpaRepository<ChatConversation, Long> {
    Optional<ChatConversation> findByConversationKey(String conversationKey);

    @EntityGraph(attributePaths = {"participants", "participants.user"})
    @Query("""
            select distinct c
            from ChatConversation c
            join c.participants p
            where p.user.id = :userId
            order by coalesce(c.lastMessageAt, c.updatedAt) desc
            """)
    List<ChatConversation> findAllForUser(@Param("userId") Long userId);

    @EntityGraph(attributePaths = {"participants", "participants.user"})
    Optional<ChatConversation> findWithParticipantsById(Long id);

    @EntityGraph(attributePaths = {"participants", "participants.user"})
    Optional<ChatConversation> findWithParticipantsByConversationKey(String conversationKey);
}
