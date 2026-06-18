package com.chat.chatBox.service;

import com.chat.chatBox.model.ChatMessage;
import java.time.Instant;
import org.springframework.stereotype.Component;

@Component
public class ChatMessageFactory {

    public ChatMessage userMessage(String clientId, String sender, String content) {
        return build(clientId, sender, content, "CHAT");
    }

    public ChatMessage botMessage(String clientId, String content) {
        return build(clientId, "ChatBot", content, "BOT");
    }

    public ChatMessage botTypingMessage(String clientId) {
        return build(clientId, "ChatBot", "is typing...", "BOT_TYPING");
    }

    public ChatMessage systemMessage(String clientId, String content) {
        return build(clientId, "System", content, "SYSTEM");
    }

    private ChatMessage build(String clientId, String sender, String content, String type) {
        ChatMessage message = new ChatMessage();
        message.setClientId(clientId);
        message.setSender(sender);
        message.setContent(content);
        message.setType(type);
        message.setTimestamp(Instant.now().toEpochMilli());
        return message;
    }
}
