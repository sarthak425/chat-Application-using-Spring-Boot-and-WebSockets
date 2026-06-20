import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import ChatHeader from '../components/ChatHeader';
import CallOverlay from '../components/CallOverlay';
import Composer from '../components/Composer';
import MessageList from '../components/MessageList';
import NewChatModal from '../components/NewChatModal';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { http } from '../lib/http';
import {
  createSocketClient,
  sendCallAccept,
  sendCallEnd,
  sendCallMediaState,
  sendCallReject,
  sendCallSignal,
  sendCallStart,
  sendSocketMessage,
  sendTyping,
  sendReaction,
  subscribeToConversation,
  subscribeToInbox,
  subscribeToPresence,
  subscribeToUserCalls,
  subscribeToTyping,
  subscribeToUserMessages,
} from '../lib/socket';

// ─── Helpers ────────────────────────────────────────────────────────────────

function previewForMessage(message) {
  if (!message) return 'No messages yet';
  if (message.deleted) return 'This message was deleted';
  if (message.messageType === 'IMAGE') return '📷 Photo';
  if (message.messageType === 'FILE') return '📎 File';
  if (message.messageType === 'AUDIO') return '🎤 Voice note';
  if (message.messageType === 'VIDEO') return '🎬 Video';
  return message.content || 'Message';
}

function upsertConversation(list, incoming) {
  const next = list.filter((c) => c.id !== incoming.id);
  return [incoming, ...next].sort(
    (a, b) => new Date(b.lastMessageAt || 0) - new Date(a.lastMessageAt || 0)
  );
}

function mergeMessage(list, incoming) {
  const next = [...list];
  const last = next[next.length - 1];

  // Replace optimistic placeholder
  if (
    last?.pending &&
    last.mine &&
    last.content === incoming.content &&
    last.fileUrl === incoming.fileUrl &&
    last.messageType === incoming.messageType
  ) {
    next[next.length - 1] = { ...incoming, pending: false };
    return next;
  }

  // Update existing (edit / read receipt / reaction)
  const index = next.findIndex((m) => m.id === incoming.id);
  if (index >= 0) {
    next[index] = incoming;
    return next;
  }

  return [...next, incoming];
}

// ─── Notification helpers ────────────────────────────────────────────────────

let notifSound = null;
function playNotificationSound() {
  try {
    if (!notifSound) {
      notifSound = new Audio(
        'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2ozLS1LoNbwtHA8MiZFj8rtt3VFMiQ/hb/nwYBRPi9AfbviwH9SPS1CgbvgwXxRPi5Cf7rdwXxRP...'
      );
    }
    notifSound.currentTime = 0;
    notifSound.play().catch(() => {});
  } catch {}
}

function showBrowserNotification(title, body) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  try {
    new Notification(title, { body, icon: '/favicon.ico', tag: 'chat-message' });
  } catch {}
}

function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

function stopMediaStream(stream) {
  stream?.getTracks().forEach((track) => track.stop());
}

function streamHasLiveVideo(stream) {
  return Boolean(stream?.getVideoTracks().some((track) => track.readyState === 'live'));
}

function formatCallDuration(totalSeconds) {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds || 0));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  if (hours > 0) {
    return [hours, minutes, seconds].map((part) => String(part).padStart(2, '0')).join(':');
  }

  return [minutes, seconds].map((part) => String(part).padStart(2, '0')).join(':');
}

function describeDisplaySurface(track) {
  const surface = track?.getSettings?.().displaySurface;
  switch (surface) {
    case 'browser':
      return 'Browser tab';
    case 'window':
      return 'Application window';
    case 'monitor':
      return 'Entire screen';
    default:
      return 'Screen';
  }
}

function createCallId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

const rtcConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' }
  ]
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function ChatPage() {
  const { user, logout, token } = useAuth();
  const { pushToast } = useToast();

  const [conversations, setConversations] = useState([]);
  const [messagesByConversation, setMessagesByConversation] = useState({});
  const [hasMoreByConversation, setHasMoreByConversation] = useState({});
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [composerValue, setComposerValue] = useState('');
  const [attachment, setAttachment] = useState(null);
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [contactQuery, setContactQuery] = useState('');
  const [contacts, setContacts] = useState([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [typingByConversation, setTypingByConversation] = useState({});
  const [copiedMessageId, setCopiedMessageId] = useState(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [replyingTo, setReplyingTo] = useState(null); // MessageResponse | null
  const [callState, setCallState] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);

  const socketRef = useRef(null);
  const userMessagesSubRef = useRef(null);
  const inboxSubRef = useRef(null);
  const presenceSubRef = useRef(null);
  const callSubRef = useRef(null);
  const conversationSubRef = useRef(null);
  const typingSubRef = useRef(null);
  const scrollRef = useRef(null);
  const activeConversationIdRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const callStateRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const cameraStreamRef = useRef(null);
  const screenStreamRef = useRef(null);
  const videoSenderRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const pendingIceCandidatesRef = useRef([]);

  const deferredSearchQuery = useDeferredValue(searchQuery.trim().toLowerCase());

  // ── Derived state ──────────────────────────────────────────────────────────

  const activeConversation = useMemo(
    () => conversations.find((c) => c.id === activeConversationId) || null,
    [activeConversationId, conversations]
  );

  const activePeer = useMemo(() => {
    if (!activeConversation || !user) return null;
    return activeConversation.participants?.find((p) => p.id !== user.id) || null;
  }, [activeConversation, user]);

  const activeMessages = messagesByConversation[activeConversationId] || [];

  const filteredConversations = useMemo(() => {
    const list = conversations.filter((conversation) => conversation.type !== 'GROUP');
    if (!deferredSearchQuery) return list;
    return list.filter((c) => {
      const title = (c.name || '').toLowerCase();
      const preview = (c.lastMessagePreview || '').toLowerCase();
      const participantMatch = c.participants?.some(
        (p) =>
          p.username?.toLowerCase().includes(deferredSearchQuery) ||
          p.email?.toLowerCase().includes(deferredSearchQuery)
      );
      return title.includes(deferredSearchQuery) || preview.includes(deferredSearchQuery) || participantMatch;
    });
  }, [conversations, deferredSearchQuery]);

  // ── WebSocket connection ───────────────────────────────────────────────────

  const subscribeActiveConversation = useCallback(
    (client, conversationId) => {
      if (!client?.connected || !conversationId) return;

      conversationSubRef.current?.unsubscribe();
      typingSubRef.current?.unsubscribe();

      // Subscribe to conversation-level updates (for the open chat view)
      conversationSubRef.current = subscribeToConversation(client, conversationId, (msg) => {
        msg.mine = msg.senderId === user?.id;
        setMessagesByConversation((cur) => ({
          ...cur,
          [conversationId]: mergeMessage(cur[conversationId] || [], msg),
        }));
      });

      typingSubRef.current = subscribeToTyping(client, conversationId, (evt) => {
        if (evt.userId === user?.id) return;
        setTypingByConversation((cur) => ({
          ...cur,
          [conversationId]: evt.typing ? evt.username : false,
        }));
      });
    },
    [user?.id]
  );

  const connectSocket = useCallback(() => {
    if (!token || !user) return;

    const client = createSocketClient(token, {
      onConnect: () => {
        setConnectionStatus('online');
        requestNotificationPermission();

        // Cleanup old subscriptions
        userMessagesSubRef.current?.unsubscribe();
        inboxSubRef.current?.unsubscribe();
        presenceSubRef.current?.unsubscribe();
        callSubRef.current?.unsubscribe();

        // ✅ THE FIX: subscribe to personal message feed — receives messages for ALL conversations
        userMessagesSubRef.current = subscribeToUserMessages(client, user.id, (msg) => {
          msg.mine = msg.senderId === user.id;
          const convId = msg.conversationId;

          setMessagesByConversation((cur) => ({
            ...cur,
            [convId]: mergeMessage(cur[convId] || [], msg),
          }));

          // Update sidebar preview
          setConversations((cur) =>
            cur.map((c) =>
              c.id === convId
                ? {
                    ...c,
                    lastMessagePreview: previewForMessage(msg),
                    lastMessageAt: msg.timestamp,
                    unreadCount: msg.mine
                      ? c.unreadCount
                      : activeConversationIdRef.current === convId
                      ? 0
                      : (c.unreadCount || 0) + 1,
                  }
                : c
            )
          );

          // Notify if message is from someone else and conversation is not active
          if (!msg.mine && activeConversationIdRef.current !== convId) {
            const senderName = msg.senderName || 'Someone';
            playNotificationSound();
            showBrowserNotification(senderName, msg.content || '📎 Attachment');
          }
        });

        // Sidebar inbox summaries (conversation order / unread counts)
        inboxSubRef.current = subscribeToInbox(client, user.id, (summary) => {
          setConversations((cur) => upsertConversation(cur, summary));
        });

        // Presence updates
        presenceSubRef.current = subscribeToPresence(client, (presence) => {
          setConversations((cur) =>
            cur.map((c) => ({
              ...c,
              participants: c.participants?.map((p) =>
                p.id === presence.id
                  ? { ...p, onlineStatus: presence.onlineStatus, lastSeen: presence.lastSeen }
                  : p
              ),
            }))
          );
        });

        callSubRef.current = subscribeToUserCalls(client, user.id, (event) => {
          handleCallEvent(event);
        });

        // Resubscribe to active conversation if any
        if (activeConversationIdRef.current) {
          subscribeActiveConversation(client, activeConversationIdRef.current);
        }
      },
      onDisconnect: () => setConnectionStatus('offline'),
      onError: (error) => {
        setConnectionStatus('offline');
        pushToast(error);
      },
    });

    socketRef.current = client;
    return () => client.deactivate();
  }, [pushToast, token, user, subscribeActiveConversation]);

  useEffect(() => {
    const cleanup = connectSocket();
    return cleanup;
  }, [connectSocket]);

  // ── Load initial conversations ─────────────────────────────────────────────

  useEffect(() => {
    let active = true;
    async function loadConversations() {
      setIsLoading(true);
      try {
        const res = await http.get('/api/conversations');
        if (!active) return;
        setConversations(res.data);
      } catch (error) {
        pushToast(error?.response?.data?.message || 'Unable to load conversations');
      } finally {
        if (active) setIsLoading(false);
      }
    }
    loadConversations();
    return () => { active = false; };
  }, [pushToast]);

  // ── Sync activeConversationIdRef ───────────────────────────────────────────

  useEffect(() => {
    activeConversationIdRef.current = activeConversationId;
  }, [activeConversationId]);
  // call state sync
  useEffect(() => {
    callStateRef.current = callState;
  }, [callState]);

  useEffect(() => {
    remoteStreamRef.current = remoteStream;
  }, [remoteStream]);

  const getCallMediaStream = useCallback(async (callType) => {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('This browser does not support calling');
    }

    const constraints = callType === 'VIDEO'
      ? { audio: true, video: { facingMode: 'user' } }
      : { audio: true, video: false };

    return navigator.mediaDevices.getUserMedia(constraints);
  }, []);

  const buildLocalPreviewStream = useCallback(() => {
    const current = callStateRef.current;
    const cameraStream = cameraStreamRef.current;
    const screenStream = screenStreamRef.current;

    if (!current || (!cameraStream && !screenStream)) {
      return null;
    }

    const tracks = [];
    const audioTrack = cameraStream?.getAudioTracks().find((track) => track.readyState === 'live');
    if (audioTrack) {
      tracks.push(audioTrack);
    }

    const activeVideoTrack = current.localScreenSharing
      ? screenStream?.getVideoTracks().find((track) => track.readyState === 'live')
      : current.cameraEnabled
        ? cameraStream?.getVideoTracks().find((track) => track.readyState === 'live')
        : null;

    if (activeVideoTrack) {
      tracks.push(activeVideoTrack);
    }

    return tracks.length ? new MediaStream(tracks) : null;
  }, []);

  const syncLocalPreviewStream = useCallback(() => {
    setLocalStream(buildLocalPreviewStream());
  }, [buildLocalPreviewStream]);

  const replaceVideoSenderTrack = useCallback(async (track) => {
    const sender = videoSenderRef.current;
    if (!sender) return;

    try {
      await sender.replaceTrack(track || null);
    } catch {
      // Ignore sender replacement errors during cleanup or renegotiation.
    }
  }, []);

  const stopScreenSharing = useCallback(
    async ({ notifyPeer = true, reason = 'STOPPED' } = {}) => {
      const current = callStateRef.current;
      if (!current?.localScreenSharing) return;

      const screenStream = screenStreamRef.current;
      screenStreamRef.current = null;
      screenStream?.getVideoTracks()?.forEach((track) => {
        track.onended = null;
      });
      stopMediaStream(screenStream);

      const fallbackTrack = current.cameraEnabled
        ? cameraStreamRef.current?.getVideoTracks().find((track) => track.readyState === 'live') || null
        : null;

      await replaceVideoSenderTrack(fallbackTrack);

      const nextState = {
        ...current,
        screenSharing: false,
        localScreenSharing: false,
        mediaLabel: null
      };

      callStateRef.current = nextState;
      setCallState(nextState);
      syncLocalPreviewStream();

      if (notifyPeer && socketRef.current?.connected) {
        sendCallMediaState(socketRef.current, {
          callId: current.callId,
          screenSharing: false,
          mediaLabel: null
        });
      }

      if (reason === 'DISPLAY_ENDED' && current.phase === 'active') {
        pushToast('Screen sharing stopped');
      }
    },
    [pushToast, replaceVideoSenderTrack, syncLocalPreviewStream]
  );

  const closePeerConnection = useCallback(() => {
    const pc = peerConnectionRef.current;
    if (!pc) return;

    try {
      pc.ontrack = null;
      pc.onicecandidate = null;
      pc.onconnectionstatechange = null;
      pc.close();
    } catch {
      // Ignore close errors from partially-initialized peers.
    } finally {
      peerConnectionRef.current = null;
      videoSenderRef.current = null;
    }
  }, []);

  const cleanupCall = useCallback(({ sendRemoteEnd = false, reason = 'ENDED' } = {}) => {
    const current = callStateRef.current;
    if (sendRemoteEnd && current) {
      if (current.direction === 'incoming' && current.phase === 'ringing') {
        sendCallReject(socketRef.current, { callId: current.callId, reason });
      } else {
        sendCallEnd(socketRef.current, { callId: current.callId, reason });
      }
    }

    callStateRef.current = null;
    closePeerConnection();
    stopMediaStream(cameraStreamRef.current);
    stopMediaStream(screenStreamRef.current);
    cameraStreamRef.current = null;
    screenStreamRef.current = null;
    videoSenderRef.current = null;
    remoteStreamRef.current = null;
    pendingIceCandidatesRef.current = [];
    setLocalStream(null);
    setRemoteStream(null);
    setCallState(null);
  }, [closePeerConnection]);

  useEffect(() => () => {
    callSubRef.current?.unsubscribe();
    cleanupCall();
  }, [cleanupCall]);

  const flushPendingIceCandidates = useCallback(async () => {
    const pc = peerConnectionRef.current;
    if (!pc) return;

    const pending = [...pendingIceCandidatesRef.current];
    pendingIceCandidatesRef.current = [];

    for (const candidate of pending) {
      try {
        await pc.addIceCandidate(candidate);
      } catch {
        // Ignore stale ICE updates.
      }
    }
  }, []);

  const createPeerConnection = useCallback((session) => {
    closePeerConnection();
    pendingIceCandidatesRef.current = [];

    const pc = new RTCPeerConnection(rtcConfiguration);
    peerConnectionRef.current = pc;
    videoSenderRef.current = pc.addTransceiver('video', { direction: 'sendrecv' }).sender;

    pc.onicecandidate = (event) => {
      if (!event.candidate) return;
      sendCallSignal(socketRef.current, {
        callId: session.callId,
        candidate: event.candidate.candidate,
        sdpMid: event.candidate.sdpMid,
        sdpMLineIndex: event.candidate.sdpMLineIndex
      });
    };

    pc.ontrack = (event) => {
      const [stream] = event.streams;
      if (stream) {
        remoteStreamRef.current = stream;
        setRemoteStream(stream);
        return;
      }

      const fallbackStream = remoteStreamRef.current || new MediaStream();
      fallbackStream.addTrack(event.track);
      remoteStreamRef.current = fallbackStream;
      setRemoteStream(new MediaStream(fallbackStream.getTracks()));
    };

    pc.onconnectionstatechange = () => {
      if (!['failed', 'disconnected', 'closed'].includes(pc.connectionState)) {
        return;
      }

      const current = callStateRef.current;
      if (current?.callId !== session.callId) {
        return;
      }

      const endedReason = pc.connectionState === 'failed' ? 'Call connection failed' : 'Call ended';
      cleanupCall();
      pushToast(endedReason);
    };

    return pc;
  }, [cleanupCall, closePeerConnection, pushToast]);

  const handleCallEvent = useCallback(async (event) => {
    if (!event?.callId) return;

    const currentCall = callStateRef.current;

    switch (event.eventType) {
      case 'INVITE': {
        if (currentCall) {
          sendCallReject(socketRef.current, { callId: event.callId, reason: 'BUSY' });
          return;
        }

        setActiveConversationId(event.conversationId);

        const session = {
          callId: event.callId,
          conversationId: event.conversationId,
          callType: event.callType,
          direction: 'incoming',
          phase: 'ringing',
          callerId: event.callerId,
          callerName: event.callerName || 'Incoming call',
          callerImage: event.callerImage || '',
          calleeId: event.calleeId,
          calleeName: event.calleeName || user?.username || 'You',
          calleeImage: event.calleeImage || '',
          peerId: event.callerId,
          peerName: event.callerName || 'Incoming call',
          peerImage: event.callerImage || '',
          muted: false,
          cameraEnabled: event.callType === 'VIDEO',
          screenSharing: false,
          localScreenSharing: false,
          mediaLabel: null,
          startedAt: null
        };

        callStateRef.current = session;
        setCallState(session);
        setLocalStream(null);
        setRemoteStream(null);
        stopMediaStream(cameraStreamRef.current);
        stopMediaStream(screenStreamRef.current);
        cameraStreamRef.current = null;
        screenStreamRef.current = null;
        remoteStreamRef.current = null;

        const pc = createPeerConnection(session);
        try {
          await pc.setRemoteDescription({ type: 'offer', sdp: event.sdp });
        } catch {
          pushToast('Unable to open incoming call');
          cleanupCall();
        }
        return;
      }

      case 'ACCEPT': {
        if (currentCall?.callId !== event.callId) return;
        const pc = peerConnectionRef.current;
        if (!pc) return;

        try {
          await pc.setRemoteDescription({ type: 'answer', sdp: event.sdp });
          await flushPendingIceCandidates();
          const startedAt = callStateRef.current?.startedAt || Date.now();
          const nextState = {
            ...callStateRef.current,
            phase: 'active',
            startedAt
          };
          callStateRef.current = nextState;
          setCallState(nextState);
          syncLocalPreviewStream();
        } catch {
          pushToast('Call answer could not be applied');
          cleanupCall();
        }
        return;
      }

      case 'ICE': {
        if (currentCall?.callId !== event.callId) return;
        const pc = peerConnectionRef.current;
        const candidate = {
          candidate: event.candidate,
          sdpMid: event.sdpMid || undefined,
          sdpMLineIndex: typeof event.sdpMLineIndex === 'number' ? event.sdpMLineIndex : undefined
        };

        if (pc?.remoteDescription) {
          try {
            await pc.addIceCandidate(candidate);
          } catch {
            // Ignore stale ICE updates.
          }
        } else {
          pendingIceCandidatesRef.current.push(candidate);
        }
        return;
      }

      case 'MEDIA_STATE': {
        if (currentCall?.callId !== event.callId) return;
        const nextState = {
          ...currentCall,
          screenSharing: Boolean(event.screenSharing),
          mediaLabel: event.mediaLabel || null
        };
        callStateRef.current = nextState;
        setCallState(nextState);
        syncLocalPreviewStream();
        return;
      }

      case 'REJECT':
      case 'END':
      case 'BUSY': {
        if (currentCall?.callId !== event.callId) return;

        const reason = (() => {
          switch (event.reason) {
            case 'USER_BUSY':
            case 'BUSY':
              return 'User is busy';
            case 'USER_UNAVAILABLE':
              return 'User is unavailable';
            case 'REJECTED':
              return 'Call declined';
            case 'CANCELLED':
              return 'Call cancelled';
            case 'MEDIA_DENIED':
              return 'Media access was denied';
            case 'ENDED':
            case 'HUNG_UP':
              return 'Call ended';
            default:
              return event.reason || (event.eventType === 'BUSY' ? 'User is busy' : 'Call ended');
          }
        })();
        cleanupCall();
        pushToast(reason);
        return;
      }

      default:
        return;
    }
  }, [cleanupCall, createPeerConnection, flushPendingIceCandidates, pushToast, syncLocalPreviewStream, user?.username]);

  // ── Fetch conversation detail & messages on select ─────────────────────────

  const fetchConversation = useCallback(async (conversationId) => {
    if (!conversationId) return;
    try {
      const res = await http.get(`/api/messages/conversation/${conversationId}/page`);
      // Use paginated endpoint
      const { messages, hasMore } = res.data || {};
      setMessagesByConversation((cur) => ({ ...cur, [conversationId]: messages || [] }));
      setHasMoreByConversation((cur) => ({ ...cur, [conversationId]: hasMore }));

      // Mark as read
      await http.post(`/api/conversations/${conversationId}/read`);
      setConversations((cur) =>
        cur.map((c) => (c.id === conversationId ? { ...c, unreadCount: 0 } : c))
      );
    } catch {
      // Fallback to non-paginated
      try {
        const res = await http.get(`/api/conversations/${conversationId}`);
        setConversations((cur) => upsertConversation(cur, res.data.conversation));
        setMessagesByConversation((cur) => ({ ...cur, [conversationId]: res.data.messages }));
      } catch (error) {
        pushToast(error?.response?.data?.message || 'Unable to open conversation');
      }
    }
  }, [pushToast]);

  useEffect(() => {
    if (!activeConversationId) return;
    fetchConversation(activeConversationId);
  }, [activeConversationId, fetchConversation]);

  // ── Subscribe to active conversation ──────────────────────────────────────

  useEffect(() => {
    if (!socketRef.current?.connected || !activeConversationId) return;
    subscribeActiveConversation(socketRef.current, activeConversationId);
  }, [activeConversationId, subscribeActiveConversation]);

  // ── Infinite scroll: load older messages ──────────────────────────────────

  const loadOlderMessages = useCallback(async () => {
    if (!activeConversationId || isLoadingOlder || !hasMoreByConversation[activeConversationId]) return;

    const messages = messagesByConversation[activeConversationId] || [];
    const oldestId = messages[0]?.id;
    if (!oldestId) return;

    const scrollEl = scrollRef.current;
    const scrollHeightBefore = scrollEl?.scrollHeight || 0;

    setIsLoadingOlder(true);
    try {
      const res = await http.get(`/api/messages/conversation/${activeConversationId}/page`, {
        params: { before: oldestId },
      });
      const { messages: older, hasMore } = res.data;
      setMessagesByConversation((cur) => ({
        ...cur,
        [activeConversationId]: [...older, ...(cur[activeConversationId] || [])],
      }));
      setHasMoreByConversation((cur) => ({ ...cur, [activeConversationId]: hasMore }));

      // Restore scroll position after prepending
      requestAnimationFrame(() => {
        if (scrollEl) {
          scrollEl.scrollTop = scrollEl.scrollHeight - scrollHeightBefore;
        }
      });
    } catch {
      /* silently ignore */
    } finally {
      setIsLoadingOlder(false);
    }
  }, [activeConversationId, isLoadingOlder, hasMoreByConversation, messagesByConversation]);

  // ── Auto-scroll to bottom on new messages ─────────────────────────────────

  useEffect(() => {
    if (!isAtBottom) return;
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [activeConversationId, activeMessages.length, typingByConversation[activeConversationId], isAtBottom]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el && activeConversationId) {
      setTimeout(() => { el.scrollTop = el.scrollHeight; }, 50);
    }
  }, [activeConversationId]);

  // ── Typing indicator auto-clear ────────────────────────────────────────────

  useEffect(() => {
    const typingValue = typingByConversation[activeConversationId];
    if (!typingValue) return;
    const t = window.setTimeout(() => {
      setTypingByConversation((cur) => ({ ...cur, [activeConversationId]: false }));
    }, 3000);
    return () => window.clearTimeout(t);
  }, [activeConversationId, typingByConversation]);

  // ── Load contacts for new chat modal ──────────────────────────────────────

  useEffect(() => {
    let active = true;
    async function loadContacts() {
      if (!newChatOpen || !contactQuery.trim()) {
        setContacts([]);
        setContactsLoading(false);
        return;
      }
      setContactsLoading(true);
      try {
        const res = await http.get('/api/users/search', { params: { q: contactQuery } });
        if (active) setContacts(res.data);
      } catch {
        if (active) setContacts([]);
      } finally {
        if (active) setContactsLoading(false);
      }
    }
    const t = window.setTimeout(loadContacts, 250);
    return () => { active = false; window.clearTimeout(t); };
  }, [contactQuery, newChatOpen]);

  // ── Send message ───────────────────────────────────────────────────────────

  async function handleSendMessage() {
    const content = composerValue.trim();
    if (!content && !attachment) return;
    if (!activeConversation) { pushToast('Choose a conversation first'); return; }

    try {
      let fileUrl = '';
      let messageType = 'TEXT';

      if (attachment) {
        const formData = new FormData();
        formData.append('file', attachment);
        const uploadRes = await http.post('/api/files/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        fileUrl = uploadRes.data.fileUrl;
        if (attachment.type?.startsWith('image/')) messageType = 'IMAGE';
        else if (attachment.type?.startsWith('audio/')) messageType = 'AUDIO';
        else if (attachment.type?.startsWith('video/')) messageType = 'VIDEO';
        else messageType = 'FILE';
      }

      // Optimistic message
      const optimistic = {
        id: crypto.randomUUID(),
        conversationId: activeConversation.id,
        senderId: user.id,
        senderName: user.username,
        content,
        fileUrl,
        messageType,
        status: 'SENT',
        timestamp: new Date().toISOString(),
        mine: true,
        pending: true,
        replyTo: replyingTo ? {
          id: replyingTo.id,
          senderId: replyingTo.senderId,
          senderName: replyingTo.senderName,
          content: replyingTo.content,
          messageType: replyingTo.messageType,
        } : null,
      };

      setMessagesByConversation((cur) => ({
        ...cur,
        [activeConversation.id]: mergeMessage(cur[activeConversation.id] || [], optimistic),
      }));
      setConversations((cur) =>
        cur.map((c) =>
          c.id === activeConversation.id
            ? { ...c, lastMessagePreview: previewForMessage(optimistic), lastMessageAt: optimistic.timestamp, unreadCount: 0 }
            : c
        )
      );

      sendSocketMessage(socketRef.current, {
        conversationId: activeConversation.id,
        content,
        fileUrl,
        messageType,
        replyToId: replyingTo?.id || null,
      });

      setComposerValue('');
      setAttachment(null);
      setReplyingTo(null);
      setIsAtBottom(true);
    } catch (error) {
      pushToast(error?.response?.data?.message || 'Unable to send message');
    }
  }

  // ── Typing ────────────────────────────────────────────────────────────────

  function handleTyping(value) {
    setComposerValue(value);
    if (!socketRef.current?.connected || !activeConversationId) return;

    sendTyping(socketRef.current, { conversationId: activeConversationId, typing: true });
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      sendTyping(socketRef.current, { conversationId: activeConversationId, typing: false });
    }, 2000);
  }

  // ── Reactions ─────────────────────────────────────────────────────────────

  function handleReact(messageId, emoji) {
    sendReaction(socketRef.current, { messageId, emoji });
  }

  // ── Copy ──────────────────────────────────────────────────────────────────

  function handleCopyMessage(messageId, text) {
    navigator.clipboard?.writeText(text);
    setCopiedMessageId(messageId);
    window.setTimeout(() => setCopiedMessageId(null), 1200);
  }

  // ── Voice ─────────────────────────────────────────────────────────────────

  function handleVoiceMessage(blob) {
    setAttachment(new File([blob], `voice-${Date.now()}.webm`, { type: blob.type || 'audio/webm' }));
  }

  async function handleStartCall(callType) {
    if (!activeConversation || !activePeer) {
      pushToast('Open a direct conversation first');
      return;
    }

    if (activeConversation.type !== 'DIRECT') {
      pushToast('Calls are only available in direct chats');
      return;
    }

    if (callStateRef.current) {
      pushToast('End the current call first');
      return;
    }

    if (!socketRef.current?.connected) {
      pushToast('Connecting to chat...');
      return;
    }

    const callId = createCallId();
    const session = {
      callId,
      conversationId: activeConversation.id,
      callType,
      direction: 'outgoing',
      phase: 'calling',
      callerId: user.id,
      callerName: user.username,
      callerImage: user.profileImage || '',
      calleeId: activePeer.id,
      calleeName: activePeer.username,
      calleeImage: activePeer.profileImage || '',
      peerId: activePeer.id,
      peerName: activePeer.username,
      peerImage: activePeer.profileImage || '',
      muted: false,
      cameraEnabled: callType === 'VIDEO',
      screenSharing: false,
      localScreenSharing: false,
      mediaLabel: null,
      startedAt: null
    };

    callStateRef.current = session;
    setCallState(session);
    setLocalStream(null);
    setRemoteStream(null);

    try {
      const stream = await getCallMediaStream(callType);
      cameraStreamRef.current = stream;
      syncLocalPreviewStream();

      const pc = createPeerConnection(session);
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        pc.addTrack(audioTrack, stream);
      }

      const videoTrack = stream.getVideoTracks()[0] || null;
      await replaceVideoSenderTrack(videoTrack);

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      sendCallStart(socketRef.current, {
        callId,
        conversationId: activeConversation.id,
        callType,
        sdp: offer.sdp || ''
      });

      setCallState((current) => (current ? { ...current, phase: 'ringing' } : current));
    } catch (error) {
      cleanupCall();
      pushToast(error?.message || 'Unable to start call');
    }
  }

  async function handleAcceptCall() {
    const current = callStateRef.current;
    if (!current || current.direction !== 'incoming') return;

    try {
      setCallState((state) => (state ? { ...state, phase: 'connecting' } : state));

      const stream = await getCallMediaStream(current.callType);
      cameraStreamRef.current = stream;
      syncLocalPreviewStream();

      const pc = peerConnectionRef.current || createPeerConnection(current);
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        pc.addTrack(audioTrack, stream);
      }

      const videoTrack = stream.getVideoTracks()[0] || null;
      await replaceVideoSenderTrack(videoTrack);

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await flushPendingIceCandidates();
      sendCallAccept(socketRef.current, {
        callId: current.callId,
        sdp: answer.sdp || ''
      });

      const startedAt = Date.now();
      const nextState = { ...current, phase: 'active', startedAt };
      callStateRef.current = nextState;
      setCallState(nextState);
      syncLocalPreviewStream();
    } catch (error) {
      if (callStateRef.current?.direction === 'incoming') {
        sendCallReject(socketRef.current, { callId: current.callId, reason: 'MEDIA_DENIED' });
      }
      cleanupCall();
      pushToast(error?.message || 'Unable to answer call');
    }
  }

  function handleRejectCall() {
    const current = callStateRef.current;
    if (!current) return;

    sendCallReject(socketRef.current, {
      callId: current.callId,
      reason: current.direction === 'incoming' ? 'REJECTED' : 'CANCELLED'
    });
    cleanupCall();
  }

  function handleEndCall() {
    const current = callStateRef.current;
    if (!current) return;

    sendCallEnd(socketRef.current, {
      callId: current.callId,
      reason: 'ENDED'
    });
    cleanupCall();
  }

  function handleToggleMute() {
    const current = callStateRef.current;
    const stream = cameraStreamRef.current;
    if (!current || !stream) return;

    const nextMuted = !current.muted;
    stream.getAudioTracks().forEach((track) => {
      track.enabled = !nextMuted;
    });

    setCallState((state) => (state ? { ...state, muted: nextMuted } : state));
  }

  function handleToggleVideo() {
    const current = callStateRef.current;
    const stream = cameraStreamRef.current;
    if (!current || !stream || current.callType !== 'VIDEO') return;

    const videoTrack = stream.getVideoTracks()[0];
    if (!videoTrack) return;

    const nextCameraEnabled = !current.cameraEnabled;
    videoTrack.enabled = nextCameraEnabled;

    if (!current.localScreenSharing) {
      replaceVideoSenderTrack(nextCameraEnabled ? videoTrack : null);
    }

    const nextState = { ...current, cameraEnabled: nextCameraEnabled };
    callStateRef.current = nextState;
    setCallState(nextState);
    syncLocalPreviewStream();
  }

  async function handleToggleScreenShare() {
    const current = callStateRef.current;
    if (!current || current.phase !== 'active') return;

    if (current.screenSharing && !current.localScreenSharing) {
      pushToast('The other user is already sharing their screen');
      return;
    }

    if (current.localScreenSharing) {
      await stopScreenSharing({ notifyPeer: true });
      return;
    }

    if (!navigator.mediaDevices?.getDisplayMedia) {
      pushToast('This browser does not support screen sharing');
      return;
    }

    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          frameRate: { ideal: 15, max: 30 }
        },
        audio: false
      });

      const screenTrack = displayStream.getVideoTracks()[0];
      if (!screenTrack) {
        stopMediaStream(displayStream);
        throw new Error('Screen share stream is unavailable');
      }

      screenStreamRef.current = displayStream;
      const mediaLabel = describeDisplaySurface(screenTrack);
      screenTrack.onended = () => {
        if (callStateRef.current?.screenSharing) {
          stopScreenSharing({ notifyPeer: true, reason: 'DISPLAY_ENDED' });
        }
      };

      await replaceVideoSenderTrack(screenTrack);

      const nextState = {
        ...current,
        screenSharing: true,
        localScreenSharing: true,
        mediaLabel
      };
      callStateRef.current = nextState;
      setCallState(nextState);
      syncLocalPreviewStream();

      if (socketRef.current?.connected) {
        sendCallMediaState(socketRef.current, {
          callId: current.callId,
          screenSharing: true,
          mediaLabel
        });
      }
    } catch (error) {
      screenStreamRef.current?.getVideoTracks()?.forEach((track) => {
        track.onended = null;
      });
      stopMediaStream(screenStreamRef.current);
      screenStreamRef.current = null;
      pushToast(error?.message || 'Unable to start screen sharing');
    }
  }

  async function handleDeleteMessage(messageId) {
    try {
      await http.delete(`/api/messages/${messageId}`);
    } catch (error) {
      pushToast(error?.response?.data?.message || 'Unable to delete message');
    }
  }

  // ── Edit ──────────────────────────────────────────────────────────────────

  async function handleEditMessage(messageId, newContent) {
    try {
      await http.patch(`/api/messages/${messageId}`, { content: newContent });
    } catch (error) {
      pushToast(error?.response?.data?.message || 'Unable to edit message');
    }
  }

  // ── Scroll ────────────────────────────────────────────────────────────────

  function handleScroll() {
    const el = scrollRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    setIsAtBottom(nearBottom);

    // Trigger infinite scroll at top
    if (el.scrollTop < 80) {
      loadOlderMessages();
    }
  }

  function scrollToLatest() {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    setIsAtBottom(true);
  }

  // ── Open conversation with contact ────────────────────────────────────────

  async function openConversationWithContact(contact) {
    try {
      const res = await http.post('/api/conversations/direct', { participantId: contact.id });
      setConversations((cur) => upsertConversation(cur, res.data));
      setActiveConversationId(res.data.id);
      setNewChatOpen(false);
      setContactQuery('');
    } catch (error) {
      pushToast(error?.response?.data?.message || 'Unable to start chat');
    }
  }

  function onLogout() {
    logout();
    window.location.href = '/login';
  }

  const typingLabel = typingByConversation[activeConversationId]
    ? `${typingByConversation[activeConversationId]} is typing`
    : '';

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="h-screen overflow-hidden bg-wa-bg text-white">
      <div className="grid h-full grid-cols-1 lg:grid-cols-[380px_1fr]">
        <Sidebar
          conversations={filteredConversations}
          activeConversationId={activeConversationId}
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
          onCreateConversation={() => setNewChatOpen(true)}
          onSelectConversation={setActiveConversationId}
          profile={user}
          onLogout={onLogout}
          connectionStatus={connectionStatus}
          currentUserId={user?.id}
          isLoading={isLoading}
        />

        <main className="flex min-w-0 flex-col bg-wa-chat-bg relative">
          <ChatHeader
            conversation={activeConversation}
            peer={activePeer}
            online={Boolean(activePeer?.onlineStatus)}
            typingLabel={typingLabel}
            onNewChat={() => setNewChatOpen(true)}
            onStartAudioCall={() => handleStartCall('AUDIO')}
            onStartVideoCall={() => handleStartCall('VIDEO')}
            callDisabled={!activeConversation || !activePeer || Boolean(callState)}
          />

          <MessageList
            messages={activeMessages}
            isTyping={Boolean(typingByConversation[activeConversationId])}
            typingLabel={typingLabel}
            onCopyMessage={handleCopyMessage}
            onReact={handleReact}
            onReply={setReplyingTo}
            onDeleteMessage={handleDeleteMessage}
            onEditMessage={handleEditMessage}
            copiedMessageId={copiedMessageId}
            isAtBottom={isAtBottom}
            onScrollToLatest={scrollToLatest}
            onStartNewChat={() => setNewChatOpen(true)}
            onScroll={handleScroll}
            scrollRef={scrollRef}
            isLoading={isLoading}
            isLoadingOlder={isLoadingOlder}
            currentUserId={user?.id}
          />

          <Composer
            value={composerValue}
            onChange={handleTyping}
            onSend={handleSendMessage}
            attachment={attachment}
            onAttachmentSelect={setAttachment}
            onRemoveAttachment={() => setAttachment(null)}
            onVoiceMessage={handleVoiceMessage}
            replyingTo={replyingTo}
            onCancelReply={() => setReplyingTo(null)}
            disabled={!activeConversation || Boolean(callState)}
          />

          <CallOverlay
            call={callState}
            localStream={localStream}
            remoteStream={remoteStream}
            onAccept={handleAcceptCall}
            onReject={handleRejectCall}
            onEnd={handleEndCall}
            onToggleMute={handleToggleMute}
            onToggleVideo={handleToggleVideo}
            onToggleScreenShare={handleToggleScreenShare}
          />
        </main>
      </div>

      <NewChatModal
        open={newChatOpen}
        contacts={contacts}
        searchQuery={contactQuery}
        onSearchQueryChange={setContactQuery}
        onSelectContact={openConversationWithContact}
        onClose={() => setNewChatOpen(false)}
        loading={contactsLoading}
      />
    </div>
  );
}

