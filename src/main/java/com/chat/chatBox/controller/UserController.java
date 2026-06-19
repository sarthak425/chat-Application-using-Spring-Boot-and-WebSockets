package com.chat.chatBox.controller;

import com.chat.chatBox.dto.ChatDtos;
import com.chat.chatBox.service.UserService;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping("/api/users/search")
    public ResponseEntity<List<ChatDtos.UserSummaryResponse>> search(@RequestParam(defaultValue = "") String q) {
        return ResponseEntity.ok(userService.searchUsers(q));
    }
}
