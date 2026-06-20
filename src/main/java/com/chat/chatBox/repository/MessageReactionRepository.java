package com.chat.chatBox.repository;

import com.chat.chatBox.entity.MessageReaction;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface MessageReactionRepository extends JpaRepository<MessageReaction, Long> {

    @EntityGraph(attributePaths = {"user"})
    List<MessageReaction> findByMessageId(Long messageId);

    Optional<MessageReaction> findByMessageIdAndUserId(Long messageId, Long userId);

    @Modifying
    @Query("delete from MessageReaction r where r.message.id = :messageId and r.user.id = :userId")
    int deleteByMessageIdAndUserId(@Param("messageId") Long messageId, @Param("userId") Long userId);

    @Query("select count(r) from MessageReaction r where r.message.id = :messageId")
    long countByMessageId(@Param("messageId") Long messageId);
}
