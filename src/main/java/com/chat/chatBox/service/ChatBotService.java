package com.chat.chatBox.service;

import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.Locale;
import org.springframework.stereotype.Service;

@Service
public class ChatBotService {

    public String generateReply(String content) {
        String normalized = content == null ? "" : content.trim().toLowerCase(Locale.ROOT);

        if (normalized.isBlank()) {
            return "Send me a message and I will reply in real time.";
        }

        if (containsAny(normalized, "hello", "hi", "hey")) {
            return "Hello. I am ready to help you chat in real time.";
        }

        if (containsAny(normalized, "help", "what can you do", "features")) {
            return "I can greet users, answer simple questions, show typing status, and suggest chat features.";
        }

        if (containsAny(normalized, "joke", "funny")) {
            return "Why did the developer stay calm? Because they had good exception handling.";
        }

        if (containsAny(normalized, "time", "clock")) {
            return "Current time is " + LocalTime.now().format(DateTimeFormatter.ofPattern("hh:mm a"));
        }

        if (containsAny(normalized, "thanks", "thank you")) {
            return "You are welcome. Keep the messages coming.";
        }

        return "I heard: \"" + content.trim() + "\". Try asking about features, time, or a joke.";
    }

    private boolean containsAny(String content, String... values) {
        for (String value : values) {
            if (content.contains(value)) {
                return true;
            }
        }
        return false;
    }
}
