package com.chat.chatBox.repository;

import com.chat.chatBox.entity.AppUser;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AppUserRepository extends JpaRepository<AppUser, Long> {
    Optional<AppUser> findByEmail(String email);

    Optional<AppUser> findByUsername(String username);

    boolean existsByEmail(String email);

    boolean existsByUsername(String username);

    List<AppUser> findByUsernameContainingIgnoreCaseOrEmailContainingIgnoreCase(String username, String email);
}
