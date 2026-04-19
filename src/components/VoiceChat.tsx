'use client';

import { useVoiceChat } from '../hooks/useVoiceChat';
import VoiceOrb from './VoiceOrb';
import ChatBox from './ChatBox';
import ActionButtons from './ActionButtons';
import { CombinedFilters } from '../types/chat';

interface VoiceChatProps {
  filters: CombinedFilters;
  onGoBack: () => void;
}

export default function VoiceChat({ filters, onGoBack }: VoiceChatProps) {
  const {
    connectionStatus,
    isInCall,
    messages,
    showChat,
    setShowChat,
    isUserTalking,
    isPartnerTalking,
    showPartnerEndedNotification,
    partnerEndedMessage,
    unreadCount,
    messageInput,
    setMessageInput,
    isMuted,
    startChat,
    stopSearching,
    endCall,
    nextPartner,
    sendMessage,
    handleKeyPress,
    toggleMute,
  } = useVoiceChat(filters);

  const statusBadge: Record<string, { label: string; color: string; dot: string }> = {
    connected: { label: 'Connected', color: 'text-emerald-600', dot: 'bg-emerald-500' },
    waiting: { label: 'Searching', color: 'text-amber-500', dot: 'bg-amber-500' },
    connecting: { label: 'Connecting', color: 'text-sky-500', dot: 'bg-sky-500' },
    disconnected: { label: 'Ready', color: 'text-indigo-500', dot: 'bg-indigo-400' },
  };

  const badge = statusBadge[connectionStatus.status] ?? statusBadge.disconnected;
  const isSearching =
    connectionStatus.status === 'waiting' || connectionStatus.status === 'connecting';

  return (
    <div className="w-full max-w-md relative animate-in fade-in zoom-in duration-700">

      {/* Partner Ended Toast */}
      {showPartnerEndedNotification && (
        <div className="fixed top-6 right-6 z-[100] flex items-center gap-3 px-5 py-3 rounded-2xl
          bg-white/80 backdrop-blur-xl border border-red-100 shadow-2xl shadow-red-200/50
          animate-in slide-in-from-right-10">
          <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="stroke-red-500">
              <path d="M18 6L6 18M6 6l12 12" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <span className="text-sm font-semibold text-slate-700">{partnerEndedMessage}</span>
        </div>
      )}

      {/* Main Card */}
      <div className="relative overflow-hidden rounded-[2.5rem] bg-white/60 backdrop-blur-3xl
        border border-white shadow-[0_32px_64px_-16px_rgba(0,0,0,0.08)] p-8
        transition-all duration-500 hover:shadow-[0_40px_80px_-16px_rgba(0,0,0,0.12)]">

        {/* Top shine */}
        <div className="absolute top-0 left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent via-white to-transparent" />

        {/* Dynamic glow */}
        <div
          className={`absolute -top-20 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full blur-[60px]
            opacity-20 transition-colors duration-1000 pointer-events-none
            ${isInCall && isUserTalking
              ? 'bg-sky-400'
              : isPartnerTalking
                ? 'bg-emerald-400'
                : 'bg-indigo-400'
            }`}
        />

        {/* Status Header */}
        <div className="flex items-center justify-between mb-8 relative z-10">
          {/* Status badge */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/50 border border-white/80 shadow-sm">
            <span
              className={`w-2 h-2 rounded-full ${badge.dot} shadow-sm ${isSearching ? 'animate-pulse' : ''
                }`}
            />
            <span className={`text-[10px] font-black uppercase tracking-widest ${badge.color}`}>
              {badge.label}
            </span>
          </div>

          {/* Filter info pill */}
          <div className="flex items-center gap-1.5">
            {!isInCall && (
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/50 border border-white/80 shadow-sm">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                  {filters.myGender === 'male' ? '♂' : '♀'}
                  {' · '}
                  {filters.myCountry.length > 10
                    ? filters.myCountry.slice(0, 10) + '…'
                    : filters.myCountry}
                </span>
              </div>
            )}

            {/* Back / change filters button — only when not in a live call */}
            {!isInCall && (
              <button
                onClick={onGoBack}
                className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-white/50
                  border border-white/80 shadow-sm text-[10px] font-black uppercase
                  tracking-widest text-slate-500 hover:bg-white/80 hover:text-slate-700
                  transition-all duration-200"
              >
                ← Filters
              </button>
            )}
          </div>
        </div>

        {/* Connection Message */}
        <p className="text-center text-slate-500 text-sm font-medium mb-6 italic">
          {connectionStatus.message}
        </p>

        {/* Hidden Audio Elements */}
        <audio id="remoteAudio" autoPlay playsInline />
        <audio id="localAudio" autoPlay muted playsInline />

        {/* Voice Orb */}
        <div className="flex justify-center my-4 transform transition-transform hover:scale-105 duration-500">
          <VoiceOrb
            isUserTalking={isUserTalking}
            isPartnerTalking={isPartnerTalking}
            isInCall={isInCall}
            status={connectionStatus.status}
          />
        </div>

        {/* Chat Toggle */}
        {isInCall && (
          <div className="flex justify-center mb-6">
            <button
              onClick={() => setShowChat(!showChat)}
              className={`relative flex items-center gap-2 px-6 py-2 rounded-full text-xs font-bold
                transition-all duration-300 shadow-sm ${showChat
                  ? 'bg-indigo-500 text-white shadow-indigo-200 shadow-lg'
                  : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-100'
                }`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="stroke-current">
                <path
                  d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"
                  strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                />
              </svg>
              {showChat ? 'Close Chat' : 'Open Messenger'}
              {!showChat && unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center
                  justify-center rounded-full bg-red-500 text-[10px] text-white animate-bounce
                  shadow-lg border-2 border-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          </div>
        )}

        {/* Chat Box */}
        {showChat && isInCall && (
          <div className="mb-6 animate-in slide-in-from-bottom-4 duration-300">
            <ChatBox
              messages={messages}
              messageInput={messageInput}
              setMessageInput={setMessageInput}
              sendMessage={sendMessage}
              handleKeyPress={handleKeyPress as any}
            />
          </div>
        )}

        {/* Volume Slider */}
        {isInCall && (
          <div className="flex justify-center items-center gap-3 mb-8 bg-slate-50/50 p-3
            rounded-2xl border border-slate-100">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="stroke-slate-400">
              <path
                d="M11 5L6 9H2v6h4l5 4V5zM15.54 8.46a5 5 0 010 7.07"
                strokeWidth="2" strokeLinecap="round"
              />
            </svg>
            <input
              type="range"
              min="0"
              max="100"
              defaultValue="100"
              onChange={(e) => {
                const el = document.getElementById('remoteAudio') as HTMLAudioElement;
                if (el) el.volume = parseInt(e.target.value) / 100;
              }}
              className="w-full h-1.5 accent-indigo-500 bg-slate-200 rounded-lg appearance-none cursor-pointer"
            />
          </div>
        )}

        {/* Action Buttons */}
        <div className="relative z-10">
          <ActionButtons
            isInCall={isInCall}
            status={connectionStatus.status}
            startChat={startChat}
            stopSearching={stopSearching}
            endCall={endCall}
            nextPartner={nextPartner}
            isMuted={isMuted}
            toggleMute={toggleMute}
          />
        </div>
      </div>

      {/* Card shadow */}
      <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-[80%] h-4 bg-slate-900/5 blur-2xl rounded-full" />
    </div>
  );
}