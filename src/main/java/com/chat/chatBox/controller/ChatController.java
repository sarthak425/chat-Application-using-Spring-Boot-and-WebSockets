package com.chat.chatBox.controller;

import com.chat.chatBox.model.ChatMessage;
import com.chat.chatBox.service.ChatBotService;
import com.chat.chatBox.service.ChatMessageFactory;
import com.chat.chatBox.service.ChatSessionService;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;

@Controller
public class ChatController {

    private final SimpMessagingTemplate messagingTemplate;
    private final ChatSessionService chatSessionService;
    private final ChatMessageFactory chatMessageFactory;
    private final ChatBotService chatBotService;

    public ChatController(
            SimpMessagingTemplate messagingTemplate,
            ChatSessionService chatSessionService,
            ChatMessageFactory chatMessageFactory,
            ChatBotService chatBotService) {
        this.messagingTemplate = messagingTemplate;
        this.chatSessionService = chatSessionService;
        this.chatMessageFactory = chatMessageFactory;
        this.chatBotService = chatBotService;
    }

    @MessageMapping("/register")
    public void register(@Payload ChatMessage chatMessage, SimpMessageHeaderAccessor headerAccessor) {
        String sessionId = headerAccessor.getSessionId();
        String sender = chatMessage.getSender() == null ? "Anonymous" : chatMessage.getSender().trim();

        if (sessionId != null) {
            chatSessionService.registerUser(sessionId, sender);
        }

        messagingTemplate.convertAndSend("/topic/messages", chatMessageFactory.systemMessage(sender + " joined the chat"));
    }

    @MessageMapping("/sendMessage")
    public void handleMessage(@Payload ChatMessage chatMessage) {
        String sender = chatMessage.getSender() == null ? "Anonymous" : chatMessage.getSender().trim();
        String content = chatMessage.getContent() == null ? "" : chatMessage.getContent().trim();

        messagingTemplate.convertAndSend("/topic/messages", chatMessageFactory.userMessage(sender, content));
        messagingTemplate.convertAndSend("/topic/messages", chatMessageFactory.botTypingMessage());

        CompletableFuture.runAsync(() -> {
            String reply = chatBotService.generateReply(content);
            messagingTemplate.convertAndSend("/topic/messages", chatMessageFactory.botMessage(reply));
        }, CompletableFuture.delayedExecutor(900, TimeUnit.MILLISECONDS));
    }

    @GetMapping("/chat")
    public String loadChatPage() {
        return "chat";
    }
}
