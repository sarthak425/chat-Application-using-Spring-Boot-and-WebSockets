package com.chat.chatBox.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.Instant;

public final class AuthDtos {
    private AuthDtos() {
    }

    public record RegisterRequest(
            @NotBlank @Size(min = 3, max = 40) String username,
            @NotBlank @Email String email,
            @NotBlank @Size(min = 8, max = 100) String password
    ) {
    }

    public record LoginRequest(
            @NotBlank @Email String email,
            @NotBlank String password
    ) {
    }

    public record UpdateProfileRequest(
            @NotBlank @Size(min = 3, max = 40) String username,
            String profileImage
    ) {
    }

    public record AuthResponse(
            String token,
            UserResponse user
    ) {
    }

    public record UserResponse(
            Long id,
            String username,
            String email,
            String profileImage,
            boolean onlineStatus,
            Instant lastSeen,
            Instant createdAt
    ) {
    }
}
