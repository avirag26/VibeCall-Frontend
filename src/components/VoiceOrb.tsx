export interface VoiceOrbProps {
  isUserTalking: boolean;
  isPartnerTalking: boolean;
  isInCall: boolean;
  status: string; // from connectionStatus.status
}

export default function VoiceOrb({ isUserTalking, isPartnerTalking, isInCall, status }: VoiceOrbProps) {
  return (
    <div className="flex justify-center mb-8">
      <div className="relative">
        {isUserTalking && isInCall && (
          <div className="absolute -top-2 -left-2 w-8 h-8 bg-blue-500 rounded-full animate-ping" />
        )}
        <div className={`w-32 h-32 rounded-full flex items-center justify-center relative overflow-hidden transition-colors duration-300 ${
          isInCall
            ? isUserTalking
              ? 'bg-blue-600 shadow-lg shadow-blue-500/50'
              : isPartnerTalking
              ? 'bg-green-500 shadow-lg shadow-green-500/50'
              : 'bg-green-500'
            : status === 'waiting'
            ? 'bg-yellow-500 animate-pulse'
            : 'bg-gray-600'
        }`}>
          {isUserTalking && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex space-x-1">
                {[6, 12, 8, 12, 6].map((h, i) => (
                  <div key={i} className="w-1 bg-white/70 animate-pulse"
                    style={{ height: `${h * 4}px`, animationDelay: `${i * 100}ms` }} />
                ))}
              </div>
            </div>
          )}
          {isPartnerTalking && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-full h-full rounded-full border-4 border-green-300 animate-pulse" />
            </div>
          )}
          <svg
            className={`w-16 h-16 text-white z-10 ${isUserTalking || isPartnerTalking ? 'animate-bounce' : ''}`}
            fill="currentColor" viewBox="0 0 20 20"
          >
            <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
          </svg>
        </div>
        {isPartnerTalking && isInCall && (
          <div className="absolute -top-2 -right-2 w-8 h-8 bg-green-500 rounded-full animate-ping" />
        )}
      </div>
    </div>
  );
}
