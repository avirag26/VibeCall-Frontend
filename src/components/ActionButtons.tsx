'use client';

export interface ActionButtonsProps {
  isInCall: boolean;
  status: string;
  startChat: () => void;
  stopSearching: () => void;
  endCall: () => void;
  nextPartner: () => void;
  isMuted: boolean;
  toggleMute: () => void;
}

export default function ActionButtons({
  isInCall,
  status,
  startChat,
  stopSearching,
  endCall,
  nextPartner,
  isMuted,
  toggleMute,
}: ActionButtonsProps) {
  const isSearching = status === 'waiting' || status === 'connecting';

  return (
    <div className="flex gap-3 justify-center">
      {!isInCall ? (
        <button
          onClick={isSearching ? stopSearching : startChat}
          style={{
            background: isSearching
              ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
              : 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
            border: isSearching
              ? '1px solid rgba(252,165,165,0.3)'
              : '1px solid rgba(129,140,248,0.5)',
            boxShadow: isSearching ? '0 4px 20px rgba(239,68,68,0.35)' : '0 4px 20px rgba(99,102,241,0.35)',
            transition: 'all 0.3s ease',
            borderRadius: '9999px',
            padding: '12px 36px',
            color: 'white',
            fontWeight: 600,
            fontSize: '0.875rem',
            letterSpacing: '0.05em',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {isSearching ? (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <rect x="6" y="6" width="12" height="12" rx="2" fill="white" fillOpacity="0.9" />
              </svg>
              Stop Searching
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M12 2a7 7 0 017 7c0 5.25-7 13-7 13S5 14.25 5 9a7 7 0 017-7z" fill="white" fillOpacity="0.9" />
                <circle cx="12" cy="9" r="2.5" fill="rgba(99,102,241,1)" />
              </svg>
              Start Chat
            </>
          )}
        </button>
      ) : (
        <>
          {/* Mute button */}
          <button
            onClick={toggleMute}
            style={{
              background: isMuted ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' : 'linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(79,70,229,0.15) 100%)',
              border: isMuted ? '1px solid rgba(251,191,36,0.5)' : '1px solid rgba(99,102,241,0.4)',
              boxShadow: isMuted ? '0 4px 16px rgba(245,158,11,0.3)' : '0 4px 16px rgba(99,102,241,0.15)',
              borderRadius: '9999px',
              padding: '12px 24px',
              color: isMuted ? 'white' : '#6366f1',
              fontWeight: 600,
              fontSize: '0.875rem',
              letterSpacing: '0.05em',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '7px',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.transform = 'none';
            }}
          >
            {isMuted ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="1" y1="1" x2="23" y2="23"></line>
                <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"></path>
                <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"></path>
                <line x1="12" y1="19" x2="12" y2="23"></line>
                <line x1="8" y1="23" x2="16" y2="23"></line>
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                <line x1="12" y1="19" x2="12" y2="23"></line>
                <line x1="8" y1="23" x2="16" y2="23"></line>
              </svg>
            )}
            {isMuted ? 'Unmute' : 'Mute'}
          </button>

          {/* End Call button */}
          <button
            onClick={endCall}
            style={{
              background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
              border: '1px solid rgba(252,165,165,0.3)',
              boxShadow: '0 4px 20px rgba(239,68,68,0.35)',
              borderRadius: '9999px',
              padding: '12px 28px',
              color: 'white',
              fontWeight: 600,
              fontSize: '0.875rem',
              letterSpacing: '0.05em',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '7px',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 6px 28px rgba(239,68,68,0.55)';
              (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 20px rgba(239,68,68,0.35)';
              (e.currentTarget as HTMLButtonElement).style.transform = 'none';
            }}
          >
            {/* Phone hangup icon */}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z" fill="white" />
            </svg>
            End
          </button>

          {/* Next partner button */}
          <button
            onClick={nextPartner}
            style={{
              background: 'linear-gradient(135deg, rgba(251,191,36,0.15) 0%, rgba(245,158,11,0.15) 100%)',
              border: '1px solid rgba(251,191,36,0.4)',
              boxShadow: '0 4px 16px rgba(251,191,36,0.15)',
              borderRadius: '9999px',
              padding: '12px 28px',
              color: '#fde68a',
              fontWeight: 600,
              fontSize: '0.875rem',
              letterSpacing: '0.05em',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '7px',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.background = 'linear-gradient(135deg, rgba(251,191,36,0.25) 0%, rgba(245,158,11,0.25) 100%)';
              (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.background = 'linear-gradient(135deg, rgba(251,191,36,0.15) 0%, rgba(245,158,11,0.15) 100%)';
              (e.currentTarget as HTMLButtonElement).style.transform = 'none';
            }}
          >
            {/* Skip / shuffle icon */}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M16 4l4 4-4 4V9H8.5C7.1 9 6 10.1 6 11.5S7.1 14 8.5 14H9v2H8.5C6 16 4 14 4 11.5S6 7 8.5 7H16V4zM8 16l-4-4 4-4v2.5h7.5c1.4 0 2.5 1.1 2.5 2.5S16.9 16 15.5 16H8z" fill="#fde68a" />
            </svg>
            Next
          </button>
        </>
      )}

      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}