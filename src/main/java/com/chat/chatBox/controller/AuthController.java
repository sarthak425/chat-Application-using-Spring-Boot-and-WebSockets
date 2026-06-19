package com.chat.chatBox.controller;

import com.chat.chatBox.dto.AuthDtos;
import com.chat.chatBox.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    public ResponseEntity<AuthDtos.AuthResponse> register(@Valid @RequestBody AuthDtos.RegisterRequest request) {
        return ResponseEntity.ok(authService.register(request));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthDtos.AuthResponse> login(@Valid @RequestBody AuthDtos.LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }

    @GetMapping("/me")
    public ResponseEntity<AuthDtos.UserResponse> me() {
        return ResponseEntity.ok(authService.me());
    }

    @PutMapping("/profile")
    public ResponseEntity<AuthDtos.UserResponse> updateProfile(@Valid @RequestBody AuthDtos.UpdateProfileRequest request) {
        return ResponseEntity.ok(authService.updateProfile(request));
    }
}
