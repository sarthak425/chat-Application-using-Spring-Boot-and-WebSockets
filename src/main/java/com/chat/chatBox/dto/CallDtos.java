package com.chat.chatBox.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;

public final class CallDtos {

    private CallDtos() {
    }

    public enum CallType {
        AUDIO,
        VIDEO
    }

    public enum CallEventType {
        INVITE,
        ACCEPT,
        ICE,
        REJECT,
        END,
        BUSY
    }

    public record StartCallRequest(
            @NotBlank String callId,
            @NotNull Long conversationId,
            @NotNull CallType callType,
            @NotBlank String sdp) {
    }

    public record AcceptCallRequest(
            @NotBlank String callId,
            @NotBlank String sdp) {
    }

    public record SignalCallRequest(
            @NotBlank String callId,
            @NotBlank String candidate,
            String sdpMid,
            Integer sdpMLineIndex) {
    }

    public record EndCallRequest(
            @NotBlank String callId,
            String reason) {
    }

    public record CallEvent(
            String callId,
            Long conversationId,
            Long callerId,
            String callerName,
            String callerImage,
            Long calleeId,
            String calleeName,
            String calleeImage,
            CallType callType,
            CallEventType eventType,
            String sdp,
            String candidate,
            String sdpMid,
            Integer sdpMLineIndex,
            String reason,
            Instant timestamp) {
    }
}
