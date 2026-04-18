export interface ActionButtonsProps {
  isInCall: boolean;
  status: string; // from connectionStatus.status
  startChat: () => void;
  endCall: () => void;
  nextPartner: () => void;
}

export default function ActionButtons({
  isInCall,
  status,
  startChat,
  endCall,
  nextPartner,
}: ActionButtonsProps) {
  return (
    <div className="flex gap-4 justify-center">
      {!isInCall ? (
        <button
          onClick={startChat}
          disabled={status === 'waiting' || status === 'connecting'}
          className="px-8 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-full font-medium transition-colors"
        >
          {status === 'waiting' || status === 'connecting'
            ? 'Searching...' : 'Start Chat'}
        </button>
      ) : (
        <>
          <button onClick={endCall}
            className="px-8 py-3 bg-red-600 hover:bg-red-700 text-white rounded-full font-medium transition-colors">
            End
          </button>
          <button onClick={nextPartner}
            className="px-8 py-3 bg-yellow-500 hover:bg-yellow-600 text-black rounded-full font-medium transition-colors">
            Next
          </button>
        </>
      )}
    </div>
  );
}
