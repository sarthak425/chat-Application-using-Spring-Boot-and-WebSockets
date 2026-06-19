package com.chat.chatBox.service;

import com.chat.chatBox.entity.AppUser;
import com.chat.chatBox.repository.AppUserRepository;
import com.chat.chatBox.security.CustomUserDetails;
import java.util.Optional;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

@Service
public class CurrentUserService {

    private final AppUserRepository appUserRepository;

    public CurrentUserService(AppUserRepository appUserRepository) {
        this.appUserRepository = appUserRepository;
    }

    public AppUser requireCurrentUser() {
        return currentUser()
                .orElseThrow(() -> new IllegalStateException("Authenticated user not found"));
    }

    public Optional<AppUser> currentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            return Optional.empty();
        }

        String email = authentication.getName();
        if (email == null || email.isBlank()) {
            return Optional.empty();
        }

        return appUserRepository.findByEmail(email);
    }

    public Long currentUserId() {
        return requireCurrentUser().getId();
    }
}
