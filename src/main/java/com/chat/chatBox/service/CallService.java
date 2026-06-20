package com.chat.chatBox.service;

import com.chat.chatBox.dto.CallDtos;
import com.chat.chatBox.entity.AppUser;
import com.chat.chatBox.entity.ChatConversation;
import com.chat.chatBox.entity.enums.ConversationType;
import com.chat.chatBox.repository.AppUserRepository;
import java.time.Instant;
import java.util.Objects;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

@Service
public class CallService {

    private final ConversationService conversationService;
    private final CurrentUserService currentUserService;
    private final AppUserRepository appUserRepository;
    private final SimpMessagingTemplate messagingTemplate;

    private final ConcurrentMap<String, CallSession> sessionsById = new ConcurrentHashMap<>();
    private final ConcurrentMap<Long, String> activeCallByUserId = new ConcurrentHashMap<>();

    public CallService(
            ConversationService conversationService,
            CurrentUserService currentUserService,
            AppUserRepository appUserRepository,
            SimpMessagingTemplate messagingTemplate) {
        this.conversationService = conversationService;
        this.currentUserService = currentUserService;
        this.appUserRepository = appUserRepository;
        this.messagingTemplate = messagingTemplate;
    }

    public void startCall(CallDtos.StartCallRequest request) {
        AppUser caller = currentUserService.requireCurrentUser();
        ChatConversation conversation = conversationService.requireConversation(request.conversationId());
        ensureDirectConversation(conversation);
        ensureParticipant(conversation, caller);

        AppUser callee = resolveOtherParticipant(conversation, caller);
        if (callee == null) {
            throw new IllegalArgumentException("No callee available for this conversation");
        }

        CallSession session = new CallSession(
                request.callId(),
                conversation.getId(),
                caller.getId(),
                caller.getUsername(),
                caller.getProfileImage(),
                callee.getId(),
                callee.getUsername(),
                callee.getProfileImage(),
                request.callType(),
                request.sdp(),
                Instant.now());

        if (isBusy(caller.getId(), request.callId())) {
            sendEvent(caller.getId(), toEvent(session, CallDtos.CallEventType.BUSY, null, null, null, null, "USER_BUSY"));
            return;
        }

        if (!callee.isOnlineStatus() || isBusy(callee.getId(), request.callId())) {
            sendEvent(caller.getId(), toEvent(session, CallDtos.CallEventType.BUSY, null, null, null, null,
                    callee.isOnlineStatus() ? "USER_BUSY" : "USER_UNAVAILABLE"));
            return;
        }

        if (sessionsById.putIfAbsent(session.callId(), session) != null) {
            throw new IllegalArgumentException("Call already exists");
        }

        activeCallByUserId.put(caller.getId(), session.callId());
        activeCallByUserId.put(callee.getId(), session.callId());

        try {
            sendEvent(callee.getId(), toEvent(session, CallDtos.CallEventType.INVITE, request.sdp(), null, null, null, null));
        } catch (RuntimeException ex) {
            cleanupSession(session.callId());
            throw ex;
        }
    }

    public void acceptCall(CallDtos.AcceptCallRequest request) {
        AppUser callee = currentUserService.requireCurrentUser();
        CallSession session = requireSession(request.callId());
        ensureCallee(session, callee);
        try {
            sendEvent(session.callerId(), toEvent(session, CallDtos.CallEventType.ACCEPT, request.sdp(), null, null, null, null));
        } catch (RuntimeException ex) {
            cleanupSession(session.callId());
            throw ex;
        }
    }

    public void relaySignal(CallDtos.SignalCallRequest request) {
        AppUser sender = currentUserService.requireCurrentUser();
        CallSession session = requireSession(request.callId());
        Long recipientId = recipientFor(session, sender.getId());
        sendEvent(recipientId, toEvent(session, CallDtos.CallEventType.ICE, null,
                request.candidate(), request.sdpMid(), request.sdpMLineIndex(), null));
    }

    public void rejectCall(CallDtos.EndCallRequest request) {
        AppUser sender = currentUserService.requireCurrentUser();
        CallSession session = requireSession(request.callId());
        Long recipientId = recipientFor(session, sender.getId());
        CallDtos.CallEventType eventType = Objects.equals(sender.getId(), session.calleeId())
                ? CallDtos.CallEventType.REJECT
                : CallDtos.CallEventType.END;
        try {
            sendEvent(recipientId, toEvent(session, eventType, null, null, null, null,
                    defaultReason(request.reason(), eventType)));
        } finally {
            cleanupSession(session.callId());
        }
    }

    public void endCall(CallDtos.EndCallRequest request) {
        AppUser sender = currentUserService.requireCurrentUser();
        CallSession session = requireSession(request.callId());
        Long recipientId = recipientFor(session, sender.getId());
        try {
            sendEvent(recipientId, toEvent(session, CallDtos.CallEventType.END, null, null, null, null,
                    defaultReason(request.reason(), CallDtos.CallEventType.END)));
        } finally {
            cleanupSession(session.callId());
        }
    }

    private CallSession requireSession(String callId) {
        CallSession session = sessionsById.get(callId);
        if (session == null) {
            throw new IllegalArgumentException("Call not found");
        }
        return session;
    }

    private void ensureDirectConversation(ChatConversation conversation) {
        if (conversation.getType() != ConversationType.DIRECT) {
            throw new IllegalArgumentException("Calls are only supported in direct conversations");
        }
    }

    private void ensureParticipant(ChatConversation conversation, AppUser user) {
        boolean allowed = conversation.getParticipants().stream()
                .anyMatch(participant -> participant.getUser().getId().equals(user.getId()));
        if (!allowed) {
            throw new IllegalArgumentException("You are not part of this conversation");
        }
    }

    private AppUser resolveOtherParticipant(ChatConversation conversation, AppUser currentUser) {
        return conversation.getParticipants().stream()
                .map(participant -> participant.getUser())
                .filter(user -> !Objects.equals(user.getId(), currentUser.getId()))
                .findFirst()
                .orElseGet(() -> conversation.getParticipants().stream()
                        .map(participant -> participant.getUser())
                        .map(user -> appUserRepository.findById(user.getId()).orElse(null))
                        .filter(Objects::nonNull)
                        .filter(user -> !Objects.equals(user.getId(), currentUser.getId()))
                        .findFirst()
                        .orElse(null));
    }

    private void ensureCallee(CallSession session, AppUser user) {
        if (!Objects.equals(session.calleeId(), user.getId())) {
            throw new IllegalArgumentException("Only the callee can accept this call");
        }
    }

    private boolean isBusy(Long userId, String callId) {
        String activeCallId = activeCallByUserId.get(userId);
        return activeCallId != null && !activeCallId.equals(callId);
    }

    private Long recipientFor(CallSession session, Long senderId) {
        if (Objects.equals(senderId, session.callerId())) {
            return session.calleeId();
        }
        if (Objects.equals(senderId, session.calleeId())) {
            return session.callerId();
        }
        throw new IllegalArgumentException("You are not part of this call");
    }

    private void sendEvent(Long userId, CallDtos.CallEvent event) {
        messagingTemplate.convertAndSend("/topic/users/" + userId + "/calls", event);
    }

    private CallDtos.CallEvent toEvent(
            CallSession session,
            CallDtos.CallEventType eventType,
            String sdp,
            String candidate,
            String sdpMid,
            Integer sdpMLineIndex,
            String reason) {
        return new CallDtos.CallEvent(
                session.callId(),
                session.conversationId(),
                session.callerId(),
                session.callerName(),
                session.callerImage(),
                session.calleeId(),
                session.calleeName(),
                session.calleeImage(),
                session.callType(),
                eventType,
                sdp,
                candidate,
                sdpMid,
                sdpMLineIndex,
                reason,
                Instant.now());
    }

    private String defaultReason(String reason, CallDtos.CallEventType eventType) {
        if (reason != null && !reason.isBlank()) {
            return reason;
        }
        return switch (eventType) {
            case BUSY -> "BUSY";
            case REJECT -> "REJECTED";
            case END -> "ENDED";
            default -> "ENDED";
        };
    }

    private void cleanupSession(String callId) {
        CallSession session = sessionsById.remove(callId);
        if (session == null) {
            return;
        }

        activeCallByUserId.computeIfPresent(session.callerId(), (userId, activeCallId) ->
                Objects.equals(activeCallId, callId) ? null : activeCallId);
        activeCallByUserId.computeIfPresent(session.calleeId(), (userId, activeCallId) ->
                Objects.equals(activeCallId, callId) ? null : activeCallId);
    }

    private record CallSession(
            String callId,
            Long conversationId,
            Long callerId,
            String callerName,
            String callerImage,
            Long calleeId,
            String calleeName,
            String calleeImage,
            CallDtos.CallType callType,
            String offerSdp,
            Instant createdAt) {
    }
}
