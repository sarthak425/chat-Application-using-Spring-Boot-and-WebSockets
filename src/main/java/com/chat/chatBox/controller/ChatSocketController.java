package com.chat.chatBox.controller;

import com.chat.chatBox.dto.ChatDtos;
import com.chat.chatBox.service.MessageService;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Controller;

@Controller
public class ChatSocketController {

    private final MessageService messageService;

    public ChatSocketController(MessageService messageService) {
        this.messageService = messageService;
    }

    @MessageMapping("/chat.send")
    public void send(@Payload ChatDtos.SendMessageRequest request) {
        messageService.sendMessage(request);
    }

    @MessageMapping("/chat.typing")
    public void typing(@Payload ChatDtos.TypingEventRequest request) {
        messageService.typing(request.conversationId(), request.typing());
    }

    @MessageMapping("/chat.read")
    public void read(@Payload ChatDtos.ReadReceiptRequest request) {
        messageService.markRead(request.conversationId());
    }
}
