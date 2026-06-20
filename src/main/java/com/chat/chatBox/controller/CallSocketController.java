package com.chat.chatBox.controller;

import com.chat.chatBox.dto.CallDtos;
import com.chat.chatBox.service.CallService;
import jakarta.validation.Valid;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Controller;
import org.springframework.validation.annotation.Validated;

@Controller
@Validated
public class CallSocketController {

    private final CallService callService;

    public CallSocketController(CallService callService) {
        this.callService = callService;
    }

    @MessageMapping("/chat.call.start")
    public void start(@Valid @Payload CallDtos.StartCallRequest request) {
        callService.startCall(request);
    }

    @MessageMapping("/chat.call.accept")
    public void accept(@Valid @Payload CallDtos.AcceptCallRequest request) {
        callService.acceptCall(request);
    }

    @MessageMapping("/chat.call.signal")
    public void signal(@Valid @Payload CallDtos.SignalCallRequest request) {
        callService.relaySignal(request);
    }

    @MessageMapping("/chat.call.reject")
    public void reject(@Valid @Payload CallDtos.EndCallRequest request) {
        callService.rejectCall(request);
    }

    @MessageMapping("/chat.call.end")
    public void end(@Valid @Payload CallDtos.EndCallRequest request) {
        callService.endCall(request);
    }
}
