package com.chat.chatBox.service;

import com.chat.chatBox.dto.AuthDtos;
import com.chat.chatBox.entity.AppUser;
import com.chat.chatBox.repository.AppUserRepository;
import com.chat.chatBox.security.JwtService;
import java.time.Instant;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

    private final AppUserRepository appUserRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final ChatMapper chatMapper;
    private final CurrentUserService currentUserService;

    public AuthService(
            AppUserRepository appUserRepository,
            PasswordEncoder passwordEncoder,
            AuthenticationManager authenticationManager,
            JwtService jwtService,
            ChatMapper chatMapper,
            CurrentUserService currentUserService) {
        this.appUserRepository = appUserRepository;
        this.passwordEncoder = passwordEncoder;
        this.authenticationManager = authenticationManager;
        this.jwtService = jwtService;
        this.chatMapper = chatMapper;
        this.currentUserService = currentUserService;
    }

    public AuthDtos.AuthResponse register(AuthDtos.RegisterRequest request) {
        if (appUserRepository.existsByEmail(request.email())) {
            throw new IllegalArgumentException("Email is already registered");
        }

        if (appUserRepository.existsByUsername(request.username())) {
            throw new IllegalArgumentException("Username is already taken");
        }

        AppUser user = AppUser.builder()
                .username(request.username().trim())
                .email(request.email().trim().toLowerCase())
                .password(passwordEncoder.encode(request.password()))
                .profileImage(null)
                .onlineStatus(true)
                .lastSeen(Instant.now())
                .createdAt(Instant.now())
                .blocked(false)
                .build();

        AppUser saved = appUserRepository.save(user);
        return new AuthDtos.AuthResponse(jwtService.generateToken(saved), chatMapper.toUserResponse(saved));
    }

    public AuthDtos.AuthResponse login(AuthDtos.LoginRequest request) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.email().trim().toLowerCase(), request.password()));

        AppUser user = appUserRepository.findByEmail(request.email().trim().toLowerCase())
                .orElseThrow(() -> new IllegalArgumentException("Invalid credentials"));
        user.markOnline();
        user.setLastSeen(Instant.now());
        appUserRepository.save(user);

        return new AuthDtos.AuthResponse(jwtService.generateToken(user), chatMapper.toUserResponse(user));
    }

    public AuthDtos.UserResponse me() {
        return chatMapper.toUserResponse(currentUserService.requireCurrentUser());
    }

    public AuthDtos.UserResponse updateProfile(AuthDtos.UpdateProfileRequest request) {
        AppUser user = currentUserService.requireCurrentUser();
        user.setUsername(request.username().trim());
        if (request.profileImage() != null) {
            user.setProfileImage(request.profileImage().trim());
        }
        return chatMapper.toUserResponse(appUserRepository.save(user));
    }
}
