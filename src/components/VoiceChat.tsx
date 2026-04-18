'use client';

import { useVoiceChat } from '../hooks/useVoiceChat';
import VoiceOrb from './VoiceOrb';
import ChatBox from './ChatBox';
import ActionButtons from './ActionButtons';

export default function VoiceChat() {
  const {
    connectionStatus,
    isInCall,
    userId,
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
    startChat,
    endCall,
    nextPartner,
    sendMessage,
    handleKeyPress,
  } = useVoiceChat();

  const statusColor = {
    connected: 'text-green-400', waiting: 'text-yellow-400',
    connecting: 'text-blue-400', disconnected: 'text-gray-400',
  }[connectionStatus.status];

  const statusLabel = {
    connected: 'Connected', waiting: 'Searching',
    connecting: 'Connecting', disconnected: 'Ready',
  }[connectionStatus.status];

  return (
    <div className="w-full max-w-md">
      {showPartnerEndedNotification && (
        <div className="fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-pulse">
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span className="font-medium">{partnerEndedMessage}</span>
          </div>
        </div>
      )}

      <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 shadow-2xl">
        <div className="text-center mb-6">
          <div className={`text-sm font-medium ${statusColor} mb-2`}>{statusLabel}</div>
          <div className="text-white text-lg">{connectionStatus.message}</div>
        </div>

        {/* Hidden audio — visible controls trigger stricter autoplay policy */}
        <audio id="remoteAudio" autoPlay playsInline className="hidden" />
        <audio id="localAudio" autoPlay muted playsInline className="hidden" />

        <VoiceOrb 
          isUserTalking={isUserTalking}
          isPartnerTalking={isPartnerTalking}
          isInCall={isInCall}
          status={connectionStatus.status}
        />

        {isInCall && (isUserTalking || isPartnerTalking) && (
          <div className="text-center mb-4 text-sm font-medium">
            {isUserTalking && <span className="text-blue-400 animate-pulse">You're talking...</span>}
            {isPartnerTalking && <span className="text-green-400 animate-pulse">Partner is talking...</span>}
          </div>
        )}

        {isInCall && (
          <div className="flex justify-center mb-4">
            <button
              onClick={() => setShowChat(!showChat)}
              className="relative px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-black rounded-full text-sm font-medium transition-colors"
            >
              {showChat ? 'Hide Chat' : 'Show Chat'}
              {!showChat && unreadCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center animate-bounce">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          </div>
        )}

        {showChat && isInCall && (
          <ChatBox 
            messages={messages}
            messageInput={messageInput}
            setMessageInput={setMessageInput}
            sendMessage={sendMessage}
            handleKeyPress={handleKeyPress as any}
          />
        )}

        {isInCall && (
          <div className="flex justify-center mb-4">
            <div className="bg-black/30 rounded-lg p-3 flex items-center gap-3">
              <span className="text-white text-sm">Volume:</span>
              <input
                type="range" min="0" max="100" defaultValue="100"
                onChange={(e) => {
                  const el = document.getElementById('remoteAudio') as HTMLAudioElement;
                  if (el) el.volume = parseInt(e.target.value) / 100;
                }}
                className="w-32 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>
        )}

        <ActionButtons 
          isInCall={isInCall}
          status={connectionStatus.status}
          startChat={startChat}
          endCall={endCall}
          nextPartner={nextPartner}
        />

        {userId && (
          <div className="text-center mt-6 text-gray-400 text-sm">
            Your ID: {userId.slice(0, 8)}...
          </div>
        )}
      </div>
    </div>
  );
}