import { useEffect, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  FiCheck,
  FiMic,
  FiMicOff,
  FiPhoneOff,
  FiVideo,
  FiVideoOff,
  FiX
} from 'react-icons/fi';

function attachStream(element, stream) {
  if (!element) return;
  element.srcObject = stream || null;
}

function initials(name) {
  return (name || 'Chat')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');
}

export default function CallOverlay({
  call,
  localStream,
  remoteStream,
  onAccept,
  onReject,
  onEnd,
  onToggleMute,
  onToggleVideo
}) {
  const remoteVideoRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);

  const isVideoCall = call?.callType === 'VIDEO';
  const otherPartyName = call?.peerName || call?.callerName || call?.calleeName || 'Chat';
  const otherPartyImage = call?.peerImage || call?.callerImage || call?.calleeImage || '';

  const statusLabel = useMemo(() => {
    if (!call) return '';
    if (call.direction === 'incoming' && call.phase === 'ringing') return 'Incoming call';
    if (call.phase === 'calling') return 'Calling...';
    if (call.phase === 'ringing') return 'Ringing...';
    if (call.phase === 'connecting') return 'Connecting...';
    if (call.phase === 'active') return isVideoCall ? 'Video call in progress' : 'Voice call in progress';
    return 'Call';
  }, [call, isVideoCall]);

  useEffect(() => {
    attachStream(remoteVideoRef.current, isVideoCall ? remoteStream : null);
    attachStream(remoteAudioRef.current, !isVideoCall ? remoteStream : null);
    attachStream(localVideoRef.current, isVideoCall ? localStream : null);
  }, [isVideoCall, localStream, remoteStream]);

  if (!call) {
    return null;
  }

  const showIncomingActions = call.direction === 'incoming' && call.phase === 'ringing';
  const showOutgoingActions = call.direction === 'outgoing' && call.phase !== 'active';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      className="fixed inset-0 z-[60] overflow-hidden bg-[#050b10]/95 text-white backdrop-blur-2xl"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(37,211,102,0.16),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.06),transparent_24%)]" />

      <div className="relative flex h-full flex-col">
        <header className="flex items-center justify-between border-b border-white/5 px-4 py-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-wa-accent to-wa-accentDark text-sm font-semibold text-wa-surface shadow-soft">
              {otherPartyImage ? (
                <img src={otherPartyImage} alt={otherPartyName} className="h-full w-full object-cover" />
              ) : (
                initials(otherPartyName)
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate font-display text-lg font-semibold text-white">{otherPartyName}</p>
              <p className="text-xs uppercase tracking-[0.22em] text-wa-accent">{statusLabel}</p>
            </div>
          </div>

          <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.22em] text-slate-300">
            {isVideoCall ? 'Video call' : 'Voice call'}
          </div>
        </header>

        <div className="relative flex flex-1 items-center justify-center p-4 sm:p-6">
          {isVideoCall && call.phase === 'active' ? (
            <div className="absolute inset-0">
              {remoteStream ? (
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-[#0b141a]">
                  <div className="flex flex-col items-center gap-4 text-center">
                    <div className="flex h-28 w-28 items-center justify-center rounded-full border border-white/10 bg-white/5 text-4xl font-semibold text-white">
                      {initials(otherPartyName)}
                    </div>
                    <div>
                      <p className="font-display text-2xl font-semibold">{otherPartyName}</p>
                      <p className="text-sm text-slate-400">Waiting for video feed</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/15" />

              <div className="absolute bottom-24 right-4 h-40 w-28 overflow-hidden rounded-3xl border border-white/15 bg-[#111b21] shadow-2xl sm:bottom-28 sm:right-6 sm:h-44 sm:w-32">
                {localStream ? (
                  <video
                    ref={localVideoRef}
                    autoPlay
                    muted
                    playsInline
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs uppercase tracking-[0.2em] text-slate-400">
                    You
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex w-full max-w-lg flex-col items-center gap-6 text-center">
              <div className="relative">
                <div className="absolute inset-0 -z-10 animate-ping rounded-full bg-wa-accent/20 blur-2xl" />
                <div className="flex h-28 w-28 items-center justify-center rounded-full border border-white/10 bg-white/5 text-4xl font-semibold text-white shadow-soft">
                  {otherPartyImage ? (
                    <img src={otherPartyImage} alt={otherPartyName} className="h-full w-full rounded-full object-cover" />
                  ) : (
                    initials(otherPartyName)
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <h1 className="font-display text-3xl font-semibold">{otherPartyName}</h1>
                <p className="text-sm text-slate-300">{statusLabel}</p>
                {call.reason ? <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{call.reason}</p> : null}
              </div>

              <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200">
                {isVideoCall ? 'Video call' : 'Voice call'} ready
              </div>
            </div>
          )}
        </div>

        <footer className="border-t border-white/5 px-4 py-5 sm:px-6">
          <div className="flex items-center justify-center gap-3">
            {showIncomingActions ? (
              <>
                <button
                  type="button"
                  onClick={onReject}
                  className="flex h-14 w-14 items-center justify-center rounded-full bg-rose-500 text-white shadow-soft transition hover:bg-rose-600"
                  aria-label="Reject call"
                >
                  <FiX className="text-2xl" />
                </button>
                <button
                  type="button"
                  onClick={onAccept}
                  className="flex h-16 w-16 items-center justify-center rounded-full bg-wa-accent text-wa-surface shadow-soft transition hover:bg-wa-accentDark"
                  aria-label="Accept call"
                >
                  <FiCheck className="text-2xl" />
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={onToggleMute}
                  disabled={!localStream}
                  className="flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label={call.muted ? 'Unmute microphone' : 'Mute microphone'}
                >
                  {call.muted ? <FiMicOff className="text-xl" /> : <FiMic className="text-xl" />}
                </button>

                {isVideoCall ? (
                  <button
                    type="button"
                    onClick={onToggleVideo}
                    disabled={!localStream}
                    className="flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label={call.videoEnabled ? 'Turn camera off' : 'Turn camera on'}
                  >
                    {call.videoEnabled ? <FiVideo className="text-xl" /> : <FiVideoOff className="text-xl" />}
                  </button>
                ) : null}

                <button
                  type="button"
                  onClick={showOutgoingActions ? onReject : onEnd}
                  className="flex h-16 w-16 items-center justify-center rounded-full bg-rose-500 text-white shadow-soft transition hover:bg-rose-600"
                  aria-label={showOutgoingActions ? 'Cancel call' : 'End call'}
                >
                  <FiPhoneOff className="text-2xl" />
                </button>
              </>
            )}
          </div>
        </footer>
      </div>

      {!isVideoCall ? <audio ref={remoteAudioRef} autoPlay className="hidden" /> : null}
    </motion.div>
  );
}
