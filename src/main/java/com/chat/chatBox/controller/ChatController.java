package com.chat.chatBox.controller;

import com.chat.chatBox.model.ChatMessage;
import com.chat.chatBox.service.ChatBotService;
import com.chat.chatBox.service.ChatMessageFactory;
import com.chat.chatBox.service.ChatSessionService;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.core.io.ResourceLoader;
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
    private final ResourceLoader resourceLoader;

    public ChatController(
            SimpMessagingTemplate messagingTemplate,
            ChatSessionService chatSessionService,
            ChatMessageFactory chatMessageFactory,
            ChatBotService chatBotService,
            ResourceLoader resourceLoader) {
        this.messagingTemplate = messagingTemplate;
        this.chatSessionService = chatSessionService;
        this.chatMessageFactory = chatMessageFactory;
        this.chatBotService = chatBotService;
        this.resourceLoader = resourceLoader;
    }

    @MessageMapping("/register")
    public void register(@Payload ChatMessage chatMessage, SimpMessageHeaderAccessor headerAccessor) {
        String sessionId = headerAccessor.getSessionId();
        String sender = chatMessage.getSender() == null ? "Anonymous" : chatMessage.getSender().trim();

        if (sessionId != null) {
            chatSessionService.registerUser(sessionId, sender);
        }
    }

    @MessageMapping("/sendMessage")
    public void handleMessage(@Payload ChatMessage chatMessage, SimpMessageHeaderAccessor headerAccessor) {
        String sessionId = headerAccessor.getSessionId();
        String clientId = resolveClientId(chatMessage, sessionId);
        String sender = chatMessage.getSender() == null ? "Anonymous" : chatMessage.getSender().trim();
        String content = chatMessage.getContent() == null ? "" : chatMessage.getContent().trim();

        messagingTemplate.convertAndSend("/topic/messages", chatMessageFactory.userMessage(clientId, sender, content));
        messagingTemplate.convertAndSend("/topic/messages", chatMessageFactory.botTypingMessage(clientId));

        CompletableFuture.runAsync(() -> {
            String reply = chatBotService.generateReply(content);
            messagingTemplate.convertAndSend("/topic/messages", chatMessageFactory.botMessage(clientId, reply));
        }, CompletableFuture.delayedExecutor(900, TimeUnit.MILLISECONDS));
    }

    private String resolveClientId(ChatMessage chatMessage, String sessionId) {
        if (chatMessage != null && chatMessage.getClientId() != null && !chatMessage.getClientId().trim().isBlank()) {
            return chatMessage.getClientId().trim();
        }

        if (sessionId != null && !sessionId.isBlank()) {
            return sessionId;
        }

        return "anonymous";
    }

    @GetMapping({"/", "/chat"})
    public String loadChatPage() {
        boolean hasReactBuild = resourceLoader.getResource("classpath:/static/index.html").exists();
        return hasReactBuild ? "forward:/index.html" : "chat";
    }
}
