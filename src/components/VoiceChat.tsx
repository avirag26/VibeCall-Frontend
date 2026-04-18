'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

const BACKEND_URL = 'https://vibecall-1-54dc.onrender.com/';

interface ConnectionStatus {
  status: 'disconnected' | 'waiting' | 'connected' | 'connecting';
  message: string;
}

interface ChatMessage {
  text: string;
  senderId: string;
  timestamp: string;
  isOwn: boolean;
}

export default function VoiceChat() {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    status: 'disconnected',
    message: 'Click Start to find someone to talk to',
  });
  const [isInCall, setIsInCall] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [showChat, setShowChat] = useState(false);
  const [isUserTalking, setIsUserTalking] = useState(false);
  const [isPartnerTalking, setIsPartnerTalking] = useState(false);
  const [showPartnerEndedNotification, setShowPartnerEndedNotification] = useState(false);
  const [partnerEndedMessage, setPartnerEndedMessage] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);

  // ── Refs (never stale in callbacks) ──────────────────────────────────────
  const socketRef = useRef<Socket | null>(null);
  const userIdRef = useRef<string | null>(null);
  const partnerIdRef = useRef<string | null>(null);          // FIX: ref not state
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const iceCandidateBufferRef = useRef<RTCIceCandidateInit[]>([]); // FIX: ref not state
  const showChatRef = useRef<boolean>(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const localSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const remoteSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const remoteAnalyserRef = useRef<AnalyserNode | null>(null);
  const isInCallRef = useRef<boolean>(false);                // FIX: mirror for callbacks

  // ── Audio level detection ─────────────────────────────────────────────────
  const detectAudioLevel = (
    analyser: AnalyserNode,
    setIsTalking: (v: boolean) => void
  ) => {
    const data = new Uint8Array(analyser.frequencyBinCount);
    let silentFrames = 0;
    let talking = false;
    const id = setInterval(() => {
      analyser.getByteFrequencyData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) sum += data[i] * data[i];
      const rms = Math.sqrt(sum / data.length);
      if (rms > 25) {
        if (!talking) { setIsTalking(true); talking = true; }
        silentFrames = 0;
      } else {
        if (++silentFrames > 20 && talking) { setIsTalking(false); talking = false; }
      }
    }, 100);
    return () => clearInterval(id);
  };

  const ensureAudioContext = () => {
    if (!audioContextRef.current) {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      if (AC) audioContextRef.current = new AC();
    }
    if (audioContextRef.current?.state === 'suspended') {
      audioContextRef.current.resume();
    }
  };

  // ── Tear-down (shared by endCall, partner-disconnected, partner-ended) ───
  const teardown = useCallback(() => {
    isInCallRef.current = false;
    setIsInCall(false);
    partnerIdRef.current = null;
    iceCandidateBufferRef.current = [];
    setMessages([]);
    setShowChat(false);
    setUnreadCount(0);
    setIsUserTalking(false);
    setIsPartnerTalking(false);

    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;

    peerConnectionRef.current?.close();
    peerConnectionRef.current = null;

    localSourceRef.current?.disconnect();
    remoteSourceRef.current?.disconnect();
    localSourceRef.current = null;
    remoteSourceRef.current = null;

    const remoteAudio = document.getElementById('remoteAudio') as HTMLAudioElement;
    if (remoteAudio) remoteAudio.srcObject = null;

    setConnectionStatus({
      status: 'disconnected',
      message: 'Click Start to find someone to talk to',
    });
  }, []);

  // ── ICE helpers ───────────────────────────────────────────────────────────
  const addIceCandidate = async (candidate: RTCIceCandidateInit) => {
    const pc = peerConnectionRef.current;
    if (!pc) return;
    if (pc.remoteDescription) {
      try { await pc.addIceCandidate(candidate); }
      catch (e) { console.warn('ICE add error:', e); }
    } else {
      iceCandidateBufferRef.current.push(candidate);  // buffer until remote desc set
    }
  };

  const flushIceCandidates = async () => {
    const pc = peerConnectionRef.current;
    if (!pc) return;
    for (const c of iceCandidateBufferRef.current) {
      try { await pc.addIceCandidate(c); }
      catch (e) { console.warn('Buffered ICE error:', e); }
    }
    iceCandidateBufferRef.current = [];
  };

  // ── Signalling (reads refs — never stale) ─────────────────────────────────
  const handleOffer = async (offer: RTCSessionDescriptionInit) => {
    const pc = peerConnectionRef.current;
    if (!pc) return;
    await pc.setRemoteDescription(offer);
    await flushIceCandidates();
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    socketRef.current?.emit('webrtc-signal', {
      type: 'answer',
      payload: answer,
      targetUserId: partnerIdRef.current,   // FIX: ref, never stale
    });
  };

  const handleAnswer = async (answer: RTCSessionDescriptionInit) => {
    const pc = peerConnectionRef.current;
    if (!pc) return;
    await pc.setRemoteDescription(answer);
    await flushIceCandidates();
  };

  // ── WebRTC init ───────────────────────────────────────────────────────────
  const initializeWebRTC = async (partnerId: string) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      localStreamRef.current = stream;

      if (audioContextRef.current) {
        const src = audioContextRef.current.createMediaStreamSource(stream.clone());
        const analyser = audioContextRef.current.createAnalyser();
        analyser.fftSize = 256;
        src.connect(analyser);
        localSourceRef.current = src;
        analyserRef.current = analyser;
        detectAudioLevel(analyser, setIsUserTalking);
      }

      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          {
            urls: 'turn:openrelay.metered.ca:80',
            username: 'openrelayproject',
            credential: 'openrelayproject',
          },
          {
            urls: 'turn:openrelay.metered.ca:443',
            username: 'openrelayproject',
            credential: 'openrelayproject',
          },
          {
            urls: 'turn:openrelay.metered.ca:443?transport=tcp',
            username: 'openrelayproject',
            credential: 'openrelayproject',
          },
        ],
      });
      peerConnectionRef.current = pc;

      stream.getTracks().forEach((t) => pc.addTrack(t, stream));

      pc.onicecandidate = ({ candidate }) => {
        if (candidate) {
          socketRef.current?.emit('webrtc-signal', {
            type: 'ice-candidate',
            payload: candidate,
            targetUserId: partnerIdRef.current,  // FIX: ref
          });
        }
      };

      pc.onconnectionstatechange = () => console.log('PC:', pc.connectionState);
      pc.oniceconnectionstatechange = () => console.log('ICE:', pc.iceConnectionState);

      pc.ontrack = (event) => {
        console.log('Remote track received');
        const remoteAudio = document.getElementById('remoteAudio') as HTMLAudioElement;
        if (!remoteAudio) return;

        // ONLY playback path — DO NOT also connect to audioContext.destination
        remoteAudio.srcObject = event.streams[0];
        remoteAudio.volume = 1.0;
        remoteAudio.muted = false;

        const play = () => {
          const ctx = audioContextRef.current;
          (ctx?.state === 'suspended' ? ctx.resume() : Promise.resolve())
            .then(() => remoteAudio.play())
            .then(() => console.log('Remote audio playing'))
            .catch((e) => console.warn('play() blocked:', e));
        };
        play();
        remoteAudio.onloadedmetadata = play;

        // Analyser only — no destination connect
        if (audioContextRef.current) {
          const src = audioContextRef.current.createMediaStreamSource(event.streams[0]);
          const analyser = audioContextRef.current.createAnalyser();
          analyser.fftSize = 256;
          src.connect(analyser);
          remoteSourceRef.current = src;
          remoteAnalyserRef.current = analyser;
          detectAudioLevel(analyser, setIsPartnerTalking);
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socketRef.current?.emit('webrtc-signal', {
        type: 'offer',
        payload: offer,
        targetUserId: partnerId,
      });

    } catch (err: any) {
      console.error('initializeWebRTC error:', err);
      setConnectionStatus({ status: 'disconnected', message: `Mic error: ${err?.message}` });
      if (err?.name === 'NotAllowedError') alert('Microphone access denied. Please allow it in browser settings.');
      else if (err?.name === 'NotFoundError') alert('No microphone found.');
      else if (err?.name === 'NotReadableError') alert('Microphone is in use by another app.');
    }
  };

  // ── Socket setup (once) ───────────────────────────────────────────────────
  useEffect(() => {
    const socket = io(BACKEND_URL, { transports: ['websocket'] });
    socketRef.current = socket;

    socket.on('connect', () => console.log('Socket connected:', socket.id));

    socket.on('user-id', (id: string) => {
      setUserId(id);
      userIdRef.current = id;
    });

    socket.on('waiting-for-partner', () =>
      setConnectionStatus({ status: 'waiting', message: 'Looking for someone to talk to...' })
    );

    socket.on('partner-found', ({ partnerId }: { partnerId: string }) => {
      console.log('Partner found:', partnerId);
      partnerIdRef.current = partnerId;  // FIX: set ref immediately before async work
      isInCallRef.current = true;
      setIsInCall(true);
      setConnectionStatus({ status: 'connected', message: 'Connected! Say hello!' });
      initializeWebRTC(partnerId);
    });

    // FIX: handler reads peerConnectionRef directly — always current, never stale closure
    socket.on('webrtc-signal', async ({ type, payload }: { type: string; payload: any }) => {
      if (type === 'offer') await handleOffer(payload);
      else if (type === 'answer') await handleAnswer(payload);
      else if (type === 'ice-candidate') await addIceCandidate(payload);
    });

    socket.on('call-ended', () => teardown());

    socket.on('partner-ended-call', (data: { message: string }) => {
      setPartnerEndedMessage(data.message || 'Your partner ended the call');
      setShowPartnerEndedNotification(true);
      teardown();
      setTimeout(() => setShowPartnerEndedNotification(false), 5000);
    });

    socket.on('partner-disconnected', () => {
      setConnectionStatus({ status: 'disconnected', message: 'Your partner disconnected' });
      teardown();
    });

    socket.on('chat-message', (message: ChatMessage) => {
      const isOwn = message.senderId === userIdRef.current;
      setMessages((prev) => [...prev, { ...message, isOwn }]);
      if (!showChatRef.current && !isOwn) setUnreadCount((n) => n + 1);
    });

    return () => { socket.close(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    showChatRef.current = showChat;
    if (showChat) setUnreadCount(0);
  }, [showChat]);

  // ── Controls ──────────────────────────────────────────────────────────────
  const startChat = () => {
    ensureAudioContext();
    setConnectionStatus({ status: 'connecting', message: 'Finding someone to talk to...' });
    socketRef.current?.emit('find-partner');
  };

  const endCall = () => {
    socketRef.current?.emit('end-call');
    teardown();
  };

  const nextPartner = () => {
    socketRef.current?.emit('next-partner');
    teardown();
  };

  const sendMessage = () => {
    if (!messageInput.trim() || !socketRef.current || !isInCallRef.current) return;
    socketRef.current.emit('chat-message', {
      text: messageInput,
      senderId: userIdRef.current,
      timestamp: new Date().toISOString(),
    });
    setMessageInput('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  // ── UI ────────────────────────────────────────────────────────────────────
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

        {/* Hidden audio — no visible controls (avoids autoplay policy) */}
        <audio id="remoteAudio" autoPlay playsInline className="hidden" />
        <audio id="localAudio" autoPlay muted playsInline className="hidden" />

        {/* Orb */}
        <div className="flex justify-center mb-8">
          <div className="relative">
            {isUserTalking && isInCall && (
              <div className="absolute -top-2 -left-2 w-8 h-8 bg-blue-500 rounded-full animate-ping" />
            )}
            <div className={`w-32 h-32 rounded-full flex items-center justify-center relative overflow-hidden transition-colors duration-300 ${
              isInCall
                ? isUserTalking ? 'bg-blue-600 shadow-lg shadow-blue-500/50'
                : isPartnerTalking ? 'bg-green-500 shadow-lg shadow-green-500/50'
                : 'bg-green-500'
              : connectionStatus.status === 'waiting' ? 'bg-yellow-500 animate-pulse'
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
              <svg className={`w-16 h-16 text-white z-10 ${isUserTalking || isPartnerTalking ? 'animate-bounce' : ''}`}
                fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
              </svg>
            </div>
            {isPartnerTalking && isInCall && (
              <div className="absolute -top-2 -right-2 w-8 h-8 bg-green-500 rounded-full animate-ping" />
            )}
          </div>
        </div>

        {isInCall && (isUserTalking || isPartnerTalking) && (
          <div className="text-center mb-4 text-sm font-medium">
            {isUserTalking && <span className="text-blue-400 animate-pulse">You're talking...</span>}
            {isPartnerTalking && <span className="text-green-400 animate-pulse">Partner is talking...</span>}
          </div>
        )}

        {isInCall && (
          <div className="flex justify-center mb-4">
            <button onClick={() => setShowChat((v) => !v)}
              className="relative px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-black rounded-full text-sm font-medium transition-colors">
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
              <input type="text" value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type a message..."
                className="flex-1 px-3 py-2 bg-black/50 text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <button onClick={sendMessage}
                className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-black rounded-lg text-sm font-medium transition-colors">
                Send
              </button>
            </div>
          </div>
        )}

        {isInCall && (
          <div className="flex justify-center mb-4">
            <div className="bg-black/30 rounded-lg p-3 flex items-center gap-3">
              <span className="text-white text-sm">Volume:</span>
              <input type="range" min="0" max="100" defaultValue="100"
                onChange={(e) => {
                  const el = document.getElementById('remoteAudio') as HTMLAudioElement;
                  if (el) el.volume = parseInt(e.target.value) / 100;
                }}
                className="w-32 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer" />
            </div>
          </div>
        )}

        <div className="flex gap-4 justify-center">
          {!isInCall ? (
            <button onClick={startChat}
              disabled={connectionStatus.status === 'waiting' || connectionStatus.status === 'connecting'}
              className="px-8 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-full font-medium transition-colors">
              {connectionStatus.status === 'waiting' || connectionStatus.status === 'connecting' ? 'Searching...' : 'Start Chat'}
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

        {userId && (
          <div className="text-center mt-6 text-gray-400 text-sm">
            Your ID: {userId.slice(0, 8)}...
          </div>
        )}
      </div>
    </div>
  );
}