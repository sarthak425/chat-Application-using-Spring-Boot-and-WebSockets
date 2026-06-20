import { useEffect, useRef, useState } from 'react';
import { FiPaperclip, FiSend, FiSmile, FiMic, FiX } from 'react-icons/fi';

const EMOJIS = ['😀', '😂', '😍', '👍', '🙏', '🔥', '🎉', '😎', '❤️', '🥹'];

export default function Composer({
  value,
  onChange,
  onSend,
  attachment,
  onAttachmentSelect,
  onRemoveAttachment,
  onVoiceMessage,
  disabled = false,
  replyingTo = null,
  onCancelReply
}) {
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [recording, setRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const fileInputRef = useRef(null);

  const [previewUrl, setPreviewUrl] = useState('');

  useEffect(() => {
    if (!attachment) {
      setPreviewUrl('');
      return undefined;
    }

    const url = URL.createObjectURL(attachment);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [attachment]);

  function insertEmoji(emoji) {
    onChange(`${value}${emoji}`);
    setEmojiOpen(false);
  }

  function handleKeyDown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      onSend();
    }
  }

  function openAttachmentPicker() {
    if (disabled) return;
    fileInputRef.current?.click();
  }

  function handleFileChange(event) {
    const file = event.target.files?.[0];
    if (file) {
      onAttachmentSelect(file);
    }
    event.target.value = '';
  }

  async function toggleRecording() {
    if (disabled) return;

    if (recording) {
      mediaRecorderRef.current?.stop();
      setRecording(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      chunksRef.current = [];
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        onVoiceMessage?.(blob);
        stream.getTracks().forEach((track) => track.stop());
      };
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setRecording(true);
    } catch {
      setRecording(false);
    }
  }

  return (
    <div className="sticky bottom-0 z-20 border-t border-white/5 bg-wa-panel/95 px-4 py-3 backdrop-blur-xl sm:px-6">
      {replyingTo ? (
        <div className="mb-3 flex items-start justify-between gap-3 rounded-2xl border border-white/10 bg-[#111b21] px-4 py-3">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.2em] text-wa-accent">Replying to {replyingTo.senderName}</p>
            <p className="truncate text-sm text-slate-300">{replyingTo.content || 'Attachment'}</p>
          </div>

          {onCancelReply ? (
            <button
              type="button"
              onClick={onCancelReply}
              className="rounded-full p-2 text-slate-400 transition hover:bg-white/5 hover:text-white"
              aria-label="Cancel reply"
            >
              <FiX />
            </button>
          ) : null}
        </div>
      ) : null}

      {attachment ? (
        <div className="mb-3 flex items-center justify-between rounded-2xl border border-white/10 bg-[#111b21] p-3">
          <div className="flex items-center gap-3">
            {attachment.type?.startsWith('image/') ? (
              <img src={previewUrl} alt={attachment.name} className="h-14 w-14 rounded-2xl object-cover" />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-wa-accent/15 text-sm text-wa-accent">
                FILE
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-white">{attachment.name}</p>
              <p className="text-xs text-slate-400">{attachment.type || 'Attachment'}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onRemoveAttachment}
            className="rounded-full p-2 text-slate-400 transition hover:bg-white/5 hover:text-white"
            aria-label="Remove attachment"
          >
            <FiX />
          </button>
        </div>
      ) : null}

      <div className="flex items-end gap-2">
        <div className="relative flex items-center gap-2">
          <button
            type="button"
            onClick={() => setEmojiOpen((current) => !current)}
            disabled={disabled}
            className="rounded-full bg-white/5 p-3 text-white/80 transition hover:bg-white/10"
            aria-label="Emoji picker"
          >
            <FiSmile />
          </button>

          {emojiOpen ? (
            <div className="absolute bottom-14 left-0 z-30 grid w-60 grid-cols-5 gap-2 rounded-3xl border border-white/5 bg-[#202c33] p-3 shadow-soft">
              {EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => insertEmoji(emoji)}
                  className="rounded-2xl p-2 text-lg transition hover:bg-white/10"
                >
                  {emoji}
                </button>
              ))}
            </div>
          ) : null}

          <button
            type="button"
            onClick={openAttachmentPicker}
            disabled={disabled}
            className="rounded-full bg-white/5 p-3 text-white/80 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Attach file"
          >
            <FiPaperclip />
          </button>

          <button
            type="button"
            onClick={toggleRecording}
            disabled={disabled}
            className={[
              'rounded-full p-3 transition',
              recording ? 'bg-red-500 text-white' : 'bg-white/5 text-white/80 hover:bg-white/10',
              disabled ? 'cursor-not-allowed opacity-50 hover:bg-white/5' : ''
            ].join(' ')}
            aria-label="Voice message"
          >
            <FiMic />
          </button>

          <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} />
        </div>

        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          rows={1}
          placeholder="Type a message"
          className="max-h-40 flex-1 resize-none rounded-[28px] border border-white/10 bg-[#111b21] px-5 py-4 text-white outline-none placeholder:text-slate-500 focus:border-wa-accent"
        />

        <button
          type="button"
          onClick={onSend}
          disabled={disabled}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-wa-accent text-wa-surface shadow-soft transition hover:bg-wa-accentDark disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Send message"
        >
          <FiSend />
        </button>
      </div>
    </div>
  );
}
