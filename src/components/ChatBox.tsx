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
  return (
    <div className="mb-6 bg-black/30 rounded-xl p-4">
      <div className="h-48 overflow-y-auto mb-4 space-y-2">
        {messages.length === 0
          ? <div className="text-center text-gray-400 text-sm">No messages yet. Start the conversation!</div>
          : messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.isOwn ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[70%] px-3 py-2 rounded-lg text-sm ${msg.isOwn ? 'bg-blue-600 text-white' : 'bg-yellow-500 text-black'}`}>
                {msg.text}
              </div>
            </div>
          ))}
      </div>
      <div className="flex gap-2">
        <input
          type="text" value={messageInput}
          onChange={(e) => setMessageInput(e.target.value)}
          onKeyDown={handleKeyPress}
          placeholder="Type a message..."
          className="flex-1 px-3 py-2 bg-black/50 text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button onClick={sendMessage}
          className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-black rounded-lg text-sm font-medium transition-colors">
          Send
        </button>
      </div>
    </div>
  );
}
