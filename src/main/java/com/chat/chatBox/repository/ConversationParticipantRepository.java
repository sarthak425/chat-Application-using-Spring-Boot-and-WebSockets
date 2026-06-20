package com.chat.chatBox.repository;

import com.chat.chatBox.entity.ConversationParticipant;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ConversationParticipantRepository extends JpaRepository<ConversationParticipant, Long> {

    Optional<ConversationParticipant> findByConversationIdAndUserId(Long conversationId, Long userId);

    /**
     * Find all user IDs who share at least one conversation with the given user.
     * Used for targeted presence broadcasts.
     */
    @Query("""
            select distinct p2.user.id
            from ConversationParticipant p1
            join ConversationParticipant p2 on p2.conversation.id = p1.conversation.id
            where p1.user.id = :userId and p2.user.id <> :userId
            """)
    List<Long> findContactUserIds(@Param("userId") Long userId);
}
