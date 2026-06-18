package com.chat.chatBox.service;

import com.chat.chatBox.model.ChatMessage;
import java.time.Instant;
import org.springframework.stereotype.Component;

@Component
public class ChatMessageFactory {

    public ChatMessage userMessage(String sender, String content) {
        return build(sender, content, "CHAT");
    }

    public ChatMessage botMessage(String content) {
        return build("ChatBot", content, "BOT");
    }

    public ChatMessage botTypingMessage() {
        return build("ChatBot", "is typing...", "BOT_TYPING");
    }

    public ChatMessage systemMessage(String content) {
        return build("System", content, "SYSTEM");
    }

    private ChatMessage build(String sender, String content, String type) {
        ChatMessage message = new ChatMessage();
        message.setSender(sender);
        message.setContent(content);
        message.setType(type);
        message.setTimestamp(Instant.now().toEpochMilli());
        return message;
    }
}
