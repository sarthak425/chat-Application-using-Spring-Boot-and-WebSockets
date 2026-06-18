import { useEffect, useRef, useState } from 'react';
import { FiPaperclip, FiSmile, FiMic, FiSend, FiTrash2, FiImage, FiX } from 'react-icons/fi';

const EMOJIS = ['😀', '😂', '😍', '👍', '🙏', '🔥', '💬', '🎉', '🤖', '✅'];

export default function Composer({
  value,
  onChange,
  onSend,
  onAttachmentSelect,
  attachment,
  onClearConversation,
  onVoiceInput
}) {
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const [emojiOpen, setEmojiOpen] = useState(false);

  useEffect(() => {
    const handler = (event) => {
      if (!event.target.closest?.('[data-emoji-picker]')) {
        setEmojiOpen(false);
      }
    };

    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  function insertEmoji(emoji) {
    onChange(`${value}${emoji}`);
    setEmojiOpen(false);
    textareaRef.current?.focus();
  }

  function handleKeyDown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      onSend();
    }
  }

  return (
    <div className="sticky bottom-0 z-20 border-t border-white/5 bg-wa-panel/95 px-4 py-3 backdrop-blur-xl sm:px-6">
      {attachment ? (
        <div className="mb-3 flex items-center justify-between rounded-2xl border border-wa-accent/20 bg-wa-accent/10 px-4 py-3 text-sm text-white">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-wa-accent/20 text-wa-accent">
              <FiImage />
            </span>
            <div>
              <p className="font-medium">{attachment.name}</p>
              <p className="text-xs text-slate-400">{Math.round(attachment.size / 1024)} KB</p>
            </div>
          </div>

          <button
            onClick={() => onAttachmentSelect(null)}
            type="button"
            className="rounded-full p-2 text-slate-400 transition hover:bg-white/5 hover:text-white"
            aria-label="Remove attachment"
          >
            <FiX />
          </button>
        </div>
      ) : null}

      <div className="flex items-end gap-3">
        <div className="relative flex items-end gap-2" data-emoji-picker>
          <button
            onClick={() => setEmojiOpen((current) => !current)}
            type="button"
            className="rounded-2xl bg-white/5 p-3 text-slate-300 transition hover:bg-white/10 hover:text-white"
            aria-label="Emoji picker"
          >
            <FiSmile />
          </button>

          {emojiOpen ? (
            <div className="absolute bottom-14 left-0 z-30 grid w-60 grid-cols-5 gap-2 rounded-3xl border border-white/5 bg-[#202c33] p-3 shadow-soft">
              {EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => insertEmoji(emoji)}
                  type="button"
                  className="rounded-2xl bg-white/5 p-2 text-xl transition hover:bg-white/10"
                >
                  {emoji}
                </button>
              ))}
            </div>
          ) : null}

          <button
            onClick={() => fileInputRef.current?.click()}
            type="button"
            className="rounded-2xl bg-white/5 p-3 text-slate-300 transition hover:bg-white/10 hover:text-white"
            aria-label="Attach file"
          >
            <FiPaperclip />
          </button>

          <button
            onClick={onVoiceInput}
            type="button"
            className="rounded-2xl bg-white/5 p-3 text-slate-300 transition hover:bg-white/10 hover:text-white"
            aria-label="Voice input"
          >
            <FiMic />
          </button>
        </div>

        <div className="flex-1 rounded-[28px] border border-white/5 bg-[#202c33] px-4 py-3 shadow-inner">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            className="max-h-36 w-full resize-none bg-transparent text-[15px] text-white outline-none placeholder:text-slate-500"
            placeholder="Type a message"
          />
        </div>

        <button
          onClick={onSend}
          type="button"
          className="flex h-14 w-14 items-center justify-center rounded-full bg-wa-accent text-2xl text-wa-surface shadow-soft transition hover:scale-105 hover:bg-wa-accentDark"
          aria-label="Send message"
        >
          <FiSend />
        </button>

        <button
          onClick={onClearConversation}
          type="button"
          className="rounded-2xl bg-white/5 p-3 text-slate-300 transition hover:bg-white/10 hover:text-white"
          aria-label="Clear current conversation"
        >
          <FiTrash2 />
        </button>
      </div>

      <input
        ref={fileInputRef}
        onChange={(event) => {
          onAttachmentSelect(event.target.files?.[0] || null);
          event.target.value = '';
        }}
        className="hidden"
        type="file"
      />
    </div>
  );
}
