'use client';

import { useEffect, useRef } from 'react';
import { ChatMessage } from '../types/chat';

export interface ChatBoxProps {
  messages: ChatMessage[];
  messageInput: string;
  setMessageInput: (val: string) => void;
  sendMessage: () => void;
  handleKeyPress: (e: React.KeyboardEvent) => void;
}

export default function ChatBox({
  messages,
  messageInput,
  setMessageInput,
  sendMessage,
  handleKeyPress,
}: ChatBoxProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div
      className="mb-5"
      style={{
        background: 'rgba(0,0,0,0.35)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: '16px',
        overflow: 'hidden',
        backdropFilter: 'blur(12px)',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '10px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          display: 'flex',
          alignItems: 'center',
          gap: '7px',
        }}
      >
        <span
          style={{
            width: 7, height: 7, borderRadius: '50%',
            background: '#34d399',
            boxShadow: '0 0 8px #34d399',
          }}
        />
        <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
          Messages
        </span>
      </div>

      {/* Messages list */}
      <div
        ref={scrollRef}
        style={{
          height: 200,
          overflowY: 'auto',
          padding: '14px 14px 8px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(255,255,255,0.1) transparent',
        }}
      >
        {messages.length === 0 ? (
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 6,
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"
                stroke="rgba(255,255,255,0.18)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span style={{ color: 'rgba(255,255,255,0.22)', fontSize: '0.75rem' }}>
              No messages yet
            </span>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                justifyContent: msg.isOwn ? 'flex-end' : 'flex-start',
                animation: 'fadeSlideIn 0.2s ease',
              }}
            >
              <div
                style={{
                  maxWidth: '72%',
                  padding: '8px 12px',
                  borderRadius: msg.isOwn ? '14px 14px 3px 14px' : '14px 14px 14px 3px',
                  fontSize: '0.8rem',
                  lineHeight: 1.4,
                  fontWeight: 450,
                  background: msg.isOwn
                    ? 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)'
                    : 'rgba(255,255,255,0.09)',
                  color: msg.isOwn ? 'white' : 'rgba(255,255,255,0.85)',
                  border: msg.isOwn ? 'none' : '1px solid rgba(255,255,255,0.08)',
                  boxShadow: msg.isOwn ? '0 2px 12px rgba(99,102,241,0.3)' : 'none',
                }}
              >
                {msg.text}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Input row */}
      <div
        style={{
          padding: '10px 12px',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          display: 'flex',
          gap: '8px',
          alignItems: 'center',
        }}
      >
        <input
          type="text"
          value={messageInput}
          onChange={e => setMessageInput(e.target.value)}
          onKeyDown={handleKeyPress}
          placeholder="Type a message…"
          style={{
            flex: 1,
            padding: '8px 14px',
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '999px',
            color: 'white',
            fontSize: '0.8rem',
            outline: 'none',
            transition: 'border-color 0.2s',
          }}
          onFocus={e => (e.currentTarget.style.borderColor = 'rgba(99,102,241,0.6)')}
          onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
        />
        <button
          onClick={sendMessage}
          style={{
            width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
            background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
            border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 12px rgba(99,102,241,0.4)',
            transition: 'transform 0.15s, box-shadow 0.15s',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.08)';
            (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 18px rgba(99,102,241,0.6)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
            (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 2px 12px rgba(99,102,241,0.4)';
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
            <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}