'use client';

import { useEffect, useRef, useState } from 'react';
import { ChatMessage } from '../types/chat';
import EmojiPicker, { Theme } from 'emoji-picker-react';

export interface ChatBoxProps {
  messages: ChatMessage[];
  messageInput: string;
  setMessageInput: (val: string) => void;
  sendMessage: () => void;
  handleKeyPress: (e: React.KeyboardEvent) => void;
  onClose?: () => void;
}

export default function ChatBox({
  messages,
  messageInput,
  setMessageInput,
  sendMessage,
  handleKeyPress,
  onClose,
}: ChatBoxProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  useEffect(() => {
    if (scrollRef.current && !showEmojiPicker) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, showEmojiPicker]);

  return (
    <div
      className="mb-1 relative w-full"
      style={{
        background: '#0f172a url("https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop")',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        border: '1px solid rgba(255,255,255,0.15)',
        borderRadius: '24px',
        overflow: 'hidden',
        boxShadow: '0 20px 40px -10px rgba(0,0,0,0.3)',
        minHeight: '300px',
      }}
    >
      {/* Semi-transparent overlay to ensure text readability */}
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px]" />

      {/* Content wrapper relative to stay above overlay */}
      <div className="relative z-10 flex flex-col h-full">
        {/* Header */}
        <div
          style={{
            padding: '12px 20px',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(0,0,0,0.2)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                width: 8, height: 8, borderRadius: '50%',
                background: '#34d399',
                boxShadow: '0 0 10px #34d399',
              }}
            />
            <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              Live Chat
            </span>
          </div>

          {onClose && (
            <button
              onClick={onClose}
              style={{
                background: 'rgba(255,255,255,0.1)',
                border: 'none',
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'background 0.2s',
                color: 'rgba(255,255,255,0.7)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
                e.currentTarget.style.color = 'white';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                e.currentTarget.style.color = 'rgba(255,255,255,0.7)';
              }}
              title="Close Chat"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="stroke-current">
                <path d="M18 6L6 18M6 6l12 12" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </button>
          )}
        </div>

        <div className="relative" style={{ height: 'clamp(250px, 50vh, 350px)' }}>
          {/* Emoji Picker Overlay */}
          {showEmojiPicker && (
            <div className="absolute inset-0 z-50 bg-slate-900/95 backdrop-blur-md">
              <EmojiPicker
                theme={Theme.DARK}
                width="100%"
                height="100%"
                onEmojiClick={(emojiData) => {
                  setMessageInput(messageInput + emojiData.emoji);
                  // Keep picker open if they want to type multiple, or close it? Let's keep it open or close it?
                  // Most users prefer it stays open or closes on one click. Let's just close it.
                  setShowEmojiPicker(false);
                  const input = document.getElementById('chat-message-input');
                  if (input) input.focus();
                }}
              />
            </div>
          )}

          {/* Messages list */}
          <div
            ref={scrollRef}
            style={{
              height: '100%',
              overflowY: 'auto',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              scrollbarWidth: 'thin',
              scrollbarColor: 'rgba(255,255,255,0.2) transparent',
            }}
          >
            {messages.length === 0 ? (
              <div style={{
                flex: 1, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: 8,
              }}>
                <div style={{ background: 'rgba(255,255,255,0.1)', padding: '12px', borderRadius: '50%' }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"
                      stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', fontWeight: 500 }}>
                  Say hi to your partner!
                </span>
              </div>
            ) : (
              messages.map((msg, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    justifyContent: msg.isOwn ? 'flex-end' : 'flex-start',
                    animation: 'fadeSlideIn 0.3s ease-out',
                  }}
                >
                  <div
                    style={{
                      maxWidth: '75%',
                      padding: '10px 14px',
                      borderRadius: msg.isOwn ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                      fontSize: '0.85rem',
                      lineHeight: 1.5,
                      fontWeight: 500,
                      background: msg.isOwn
                        ? 'linear-gradient(135deg, #0ea5e9 0%, #3b82f6 100%)'
                        : 'rgba(255,255,255,0.15)',
                      backdropFilter: msg.isOwn ? 'none' : 'blur(8px)',
                      color: 'white',
                      border: msg.isOwn ? 'none' : '1px solid rgba(255,255,255,0.1)',
                      boxShadow: msg.isOwn ? '0 4px 12px rgba(59,130,246,0.3)' : '0 4px 12px rgba(0,0,0,0.1)',
                    }}
                  >
                    {msg.text}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Input row */}
        <div
          style={{
            padding: '12px',
            borderTop: '1px solid rgba(255,255,255,0.1)',
            display: 'flex',
            gap: '8px',
            alignItems: 'center',
            background: 'rgba(0,0,0,0.2)',
            flexWrap: 'nowrap',
          }}
        >
          <button
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              fontSize: '1.25rem', padding: '4px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              opacity: showEmojiPicker ? 1 : 0.7,
              transition: 'opacity 0.2s, transform 0.2s',
              transform: showEmojiPicker ? 'scale(1.1)' : 'scale(1)',
              flexShrink: 0,
              minWidth: '32px',
            }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
            onMouseLeave={e => (e.currentTarget.style.opacity = showEmojiPicker ? '1' : '0.7')}
          >
            {showEmojiPicker ? '⌨️' : '😀'}
          </button>

          <input
            id="chat-message-input"
            type="text"
            value={messageInput}
            onChange={e => setMessageInput(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Type a message…"
            autoComplete="off"
            style={{
              flex: 1,
              minWidth: '0',
              padding: '10px 12px',
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '20px',
              color: 'white',
              fontSize: '0.85rem',
              outline: 'none',
              transition: 'all 0.2s',
            }}
            onFocus={e => {
              e.currentTarget.style.borderColor = 'rgba(56,189,248,0.6)';
              e.currentTarget.style.background = 'rgba(255,255,255,0.15)';
              setShowEmojiPicker(false);
            }}
            onBlur={e => {
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
              e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
            }}
          />
          <button
            onClick={sendMessage}
            style={{
              width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
              background: 'linear-gradient(135deg, #38bdf8, #3b82f6)',
              border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(59,130,246,0.4)',
              transition: 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s',
              minWidth: '36px',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.1)';
              (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 6px 20px rgba(59,130,246,0.6)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
              (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 14px rgba(59,130,246,0.4)';
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        <style>{`
          @keyframes fadeSlideIn {
            from { opacity: 0; transform: translateY(10px) scale(0.98); }
            to { opacity: 1; transform: translateY(0) scale(1); }
          }
          /* Custom scrollbar for emoji picker to match */
          .EmojiPickerReact {
            --epr-bg-color: transparent !important;
            border: none !important;
          }
        `}</style>
      </div>
    </div>
  );
}