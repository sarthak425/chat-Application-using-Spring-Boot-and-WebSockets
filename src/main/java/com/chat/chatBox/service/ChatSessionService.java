package com.chat.chatBox.service;

import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Service;

@Service
public class ChatSessionService {

    private final Map<String, String> sessionUsers = new ConcurrentHashMap<>();

    public void registerUser(String sessionId, String sender) {
        sessionUsers.put(sessionId, sender);
    }

    public Optional<String> removeUser(String sessionId) {
        return Optional.ofNullable(sessionUsers.remove(sessionId));
    }
}
