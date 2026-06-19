package com.chat.chatBox.controller;

import com.chat.chatBox.dto.ChatDtos;
import com.chat.chatBox.service.ConversationService;
import com.chat.chatBox.service.MessageService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/conversations")
public class ConversationController {

    private final ConversationService conversationService;
    private final MessageService messageService;

    public ConversationController(ConversationService conversationService, MessageService messageService) {
        this.conversationService = conversationService;
        this.messageService = messageService;
    }

    @GetMapping
    public ResponseEntity<List<ChatDtos.ConversationSummaryResponse>> list() {
        return ResponseEntity.ok(conversationService.listConversations());
    }

    @PostMapping("/direct")
    public ResponseEntity<ChatDtos.ConversationSummaryResponse> direct(@Valid @RequestBody ChatDtos.CreateConversationRequest request) {
        var conversation = conversationService.getOrCreateDirectConversation(request.participantId());
        return ResponseEntity.ok(conversationService.getConversation(conversation.getId()).conversation());
    }

    @PostMapping("/group")
    public ResponseEntity<Void> createGroup(@RequestBody List<Long> participantIds) {
        conversationService.createGroupConversation("Group chat", participantIds);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/{id}")
    public ResponseEntity<ChatDtos.ConversationDetailResponse> detail(@PathVariable Long id) {
        return ResponseEntity.ok(conversationService.getConversation(id));
    }

    @PostMapping("/{id}/read")
    public ResponseEntity<Void> read(@PathVariable Long id) {
        messageService.markRead(id);
        return ResponseEntity.ok().build();
    }
}
