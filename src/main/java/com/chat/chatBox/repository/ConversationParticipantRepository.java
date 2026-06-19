package com.chat.chatBox.repository;

import com.chat.chatBox.entity.ConversationParticipant;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ConversationParticipantRepository extends JpaRepository<ConversationParticipant, Long> {
    Optional<ConversationParticipant> findByConversationIdAndUserId(Long conversationId, Long userId);

    List<ConversationParticipant> findByConversationId(Long conversationId);

    List<ConversationParticipant> findByUserId(Long userId);
}
