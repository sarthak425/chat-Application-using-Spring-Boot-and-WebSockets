import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  FiCamera,
  FiCameraOff,
  FiCheck,
  FiMic,
  FiMicOff,
  FiMonitor,
  FiPhoneOff,
  FiShare2,
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

function hasLiveVideo(stream) {
  return Boolean(stream?.getVideoTracks().some((track) => track.readyState === 'live'));
}

function formatDuration(totalSeconds) {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds || 0));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  if (hours > 0) {
    return [hours, minutes, seconds].map((part) => String(part).padStart(2, '0')).join(':');
  }

  return [minutes, seconds].map((part) => String(part).padStart(2, '0')).join(':');
}

export default function CallOverlay({
  call,
  localStream,
  remoteStream,
  onAccept,
  onReject,
  onEnd,
  onToggleMute,
  onToggleVideo,
  onToggleScreenShare
}) {
  const remoteVideoRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const [clock, setClock] = useState(Date.now());

  const isIncomingRinging = call?.direction === 'incoming' && call?.phase === 'ringing';
  const isActive = call?.phase === 'active';
  const isScreenSharing = Boolean(call?.screenSharing);
  const isLocalScreenSharing = Boolean(call?.localScreenSharing);
  const isVideoLayout = Boolean(call) && (
    call.callType === 'VIDEO' ||
    isScreenSharing ||
    isLocalScreenSharing
  );
  const otherPartyName = call?.peerName || call?.callerName || call?.calleeName || 'Chat';
  const otherPartyImage = call?.peerImage || call?.callerImage || call?.calleeImage || '';
  const currentTimer = call?.startedAt && isActive
    ? formatDuration(Math.floor((clock - call.startedAt) / 1000))
    : null;

  const statusLabel = useMemo(() => {
    if (!call) return '';
    if (isIncomingRinging) return 'Incoming call';
    if (call.phase === 'calling') return 'Calling...';
    if (call.phase === 'ringing') return 'Ringing...';
    if (call.phase === 'connecting') return 'Connecting...';
    if (call.phase === 'active') {
      if (call.screenSharing) {
        return `${call.mediaLabel || 'Screen'} sharing`;
      }
      return call.callType === 'VIDEO' ? 'Video call in progress' : 'Voice call in progress';
    }
    return 'Call';
  }, [call, isIncomingRinging]);

  useEffect(() => {
    attachStream(remoteVideoRef.current, isVideoLayout ? remoteStream : null);
    attachStream(remoteAudioRef.current, !isVideoLayout ? remoteStream : null);
    attachStream(localVideoRef.current, isVideoLayout ? localStream : null);
  }, [isVideoLayout, localStream, remoteStream]);

  useEffect(() => {
    if (!call?.startedAt || !isActive) {
      setClock(Date.now());
      return undefined;
    }

    setClock(Date.now());
    const timer = window.setInterval(() => setClock(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [call?.startedAt, isActive]);

  if (!call) {
    return null;
  }

  const showMediaControls = !isIncomingRinging;
  const showCameraControl = showMediaControls && call.callType === 'VIDEO';
  const showScreenShareControl = showMediaControls && isActive;
  const canShowLocalVideo = isVideoLayout && (isLocalScreenSharing || (call.cameraEnabled !== false && hasLiveVideo(localStream)));

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
              {currentTimer ? <p className="mt-1 text-xs text-slate-400">{currentTimer}</p> : null}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isScreenSharing ? (
              <div className="rounded-full border border-wa-accent/30 bg-wa-accent/10 px-3 py-1 text-xs uppercase tracking-[0.22em] text-wa-accent">
                {call.mediaLabel || 'Screen sharing'}
              </div>
            ) : null}
            <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.22em] text-slate-300">
              {isVideoLayout ? 'Video call' : 'Voice call'}
            </div>
          </div>
        </header>

        <div className="relative flex flex-1 items-center justify-center p-4 sm:p-6">
          {isVideoLayout ? (
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

              {canShowLocalVideo ? (
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

                  {isLocalScreenSharing ? (
                    <div className="absolute left-2 top-2 rounded-full bg-black/55 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-white">
                      {call.mediaLabel || 'Screen'}
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="absolute bottom-24 right-4 flex h-40 w-28 items-center justify-center rounded-3xl border border-white/15 bg-[#111b21]/90 text-xs uppercase tracking-[0.2em] text-slate-300 shadow-2xl sm:bottom-28 sm:right-6 sm:h-44 sm:w-32">
                  Camera off
                </div>
              )}
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
                {currentTimer ? <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{currentTimer}</p> : null}
                {call.reason ? <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{call.reason}</p> : null}
              </div>

              <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200">
                {call.callType === 'VIDEO' ? 'Video call' : 'Voice call'} ready
              </div>
            </div>
          )}
        </div>

        <footer className="border-t border-white/5 px-4 py-5 sm:px-6">
          <div className="flex items-center justify-center gap-3">
            {isIncomingRinging ? (
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

                {showCameraControl ? (
                  <button
                    type="button"
                    onClick={onToggleVideo}
                    disabled={!localStream}
                    className="flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label={call.cameraEnabled ? 'Turn camera off' : 'Turn camera on'}
                  >
                    {call.cameraEnabled ? <FiCamera className="text-xl" /> : <FiCameraOff className="text-xl" />}
                  </button>
                ) : null}

                {showScreenShareControl ? (
                  <button
                    type="button"
                    onClick={onToggleScreenShare}
                    disabled={isScreenSharing && !isLocalScreenSharing}
                    className={`flex h-14 w-14 items-center justify-center rounded-full border transition disabled:cursor-not-allowed disabled:opacity-40 ${
                      isLocalScreenSharing
                        ? 'border-wa-accent/40 bg-wa-accent text-wa-surface hover:bg-wa-accentDark'
                        : 'border-white/10 bg-white/5 text-white hover:bg-white/10'
                    }`}
                    aria-label={isLocalScreenSharing ? 'Stop screen sharing' : 'Start screen sharing'}
                  >
                    {isLocalScreenSharing ? <FiMonitor className="text-xl" /> : <FiShare2 className="text-xl" />}
                  </button>
                ) : null}

                <button
                  type="button"
                  onClick={isIncomingRinging ? onReject : onEnd}
                  className="flex h-16 w-16 items-center justify-center rounded-full bg-rose-500 text-white shadow-soft transition hover:bg-rose-600"
                  aria-label={isIncomingRinging ? 'Cancel call' : 'End call'}
                >
                  <FiPhoneOff className="text-2xl" />
                </button>
              </>
            )}
          </div>
        </footer>
      </div>

      {!isVideoLayout ? <audio ref={remoteAudioRef} autoPlay className="hidden" /> : null}
    </motion.div>
  );
}
