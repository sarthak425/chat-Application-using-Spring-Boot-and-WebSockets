package com.chat.chatBox.controller;

import com.chat.chatBox.dto.ChatDtos;
import com.chat.chatBox.service.MessageService;
import java.security.Principal;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Controller;
import org.springframework.validation.annotation.Validated;

@Controller
@Validated
public class ChatSocketController {

    private final MessageService messageService;

    public ChatSocketController(MessageService messageService) {
        this.messageService = messageService;
    }

    @MessageMapping("/chat.send")
    public void send(@Payload ChatDtos.SendMessageRequest request, Principal principal) {
        messageService.sendMessage(request);
    }

    @MessageMapping("/chat.typing")
    public void typing(@Payload ChatDtos.TypingEventRequest request, Principal principal) {
        messageService.typing(request.conversationId(), request.typing());
    }

    @MessageMapping("/chat.read")
    public void read(@Payload ChatDtos.ReadReceiptRequest request, Principal principal) {
        messageService.markRead(request.conversationId());
    }

    @MessageMapping("/chat.react")
    public void react(@Payload ChatDtos.ReactMessageRequest request, Principal principal) {
        messageService.reactToMessage(request.messageId(), request.emoji());
    }

    @MessageMapping("/chat.pin")
    public void pin(@Payload ChatDtos.PinMessageRequest request, Principal principal) {
        messageService.pinMessage(request.messageId(), request.pin());
    }
}
