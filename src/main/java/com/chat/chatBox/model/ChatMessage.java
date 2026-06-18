package com.chat.chatBox.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ChatMessage {
    private String clientId;
    private String sender;
    private String content;
    private String type;
    private Long timestamp;
}
