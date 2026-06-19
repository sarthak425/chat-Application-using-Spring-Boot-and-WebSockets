package com.chat.chatBox.service;

import com.chat.chatBox.dto.ChatDtos;
import com.chat.chatBox.repository.AppUserRepository;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class UserService {

    private final AppUserRepository appUserRepository;
    private final CurrentUserService currentUserService;
    private final ChatMapper chatMapper;

    public UserService(
            AppUserRepository appUserRepository,
            CurrentUserService currentUserService,
            ChatMapper chatMapper) {
        this.appUserRepository = appUserRepository;
        this.currentUserService = currentUserService;
        this.chatMapper = chatMapper;
    }

    public List<ChatDtos.UserSummaryResponse> searchUsers(String query) {
        var currentUser = currentUserService.requireCurrentUser();
        String normalized = query == null ? "" : query.trim();
        if (normalized.isBlank()) {
            return List.of();
        }

        return appUserRepository
                .findByUsernameContainingIgnoreCaseOrEmailContainingIgnoreCase(normalized, normalized)
                .stream()
                .filter(user -> !user.getId().equals(currentUser.getId()))
                .map(chatMapper::toUserSummary)
                .toList();
    }
}
