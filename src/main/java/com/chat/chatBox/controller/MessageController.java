package com.chat.chatBox.controller;

import com.chat.chatBox.dto.ChatDtos;
import com.chat.chatBox.service.MessageService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/messages")
public class MessageController {

    private final MessageService messageService;

    public MessageController(MessageService messageService) {
        this.messageService = messageService;
    }

    @PostMapping
    public ResponseEntity<ChatDtos.MessageResponse> send(@Valid @RequestBody ChatDtos.SendMessageRequest request) {
        return ResponseEntity.ok(messageService.sendMessage(request));
    }

    @GetMapping("/conversation/{conversationId}")
    public ResponseEntity<List<ChatDtos.MessageResponse>> byConversation(@PathVariable Long conversationId) {
        return ResponseEntity.ok(messageService.listMessages(conversationId));
    }

    @PatchMapping("/{id}")
    public ResponseEntity<ChatDtos.MessageResponse> edit(@PathVariable Long id, @RequestBody ChatDtos.SendMessageRequest request) {
        return ResponseEntity.ok(messageService.editMessage(id, request.content()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        messageService.deleteMessage(id);
        return ResponseEntity.noContent().build();
    }
}
