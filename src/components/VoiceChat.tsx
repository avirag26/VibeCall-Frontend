'use client';

import { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

// Environment configuration
const isTunnel = true;
const BACKEND_URL = isTunnel
  ? 'https://vibecall-1-54dc.onrender.com/'
  : 'http://localhost:3001';

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
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    status: 'disconnected',
    message: 'Click Start to find someone to talk to',
  });
  const [isInCall, setIsInCall] = useState(false);
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [showChat, setShowChat] = useState(false);
  const [iceCandidates, setIceCandidates] = useState<RTCIceCandidateInit[]>([]);
  const [isUserTalking, setIsUserTalking] = useState(false);
  const [isPartnerTalking, setIsPartnerTalking] = useState(false);
  const [showPartnerEndedNotification, setShowPartnerEndedNotification] = useState(false);
  const [partnerEndedMessage, setPartnerEndedMessage] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);

  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const userIdRef = useRef<string | null>(null);
  const showChatRef = useRef<boolean>(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const remoteAnalyserRef = useRef<AnalyserNode | null>(null);
  // Keep references to audio nodes to prevent GC
  const localSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const remoteSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  // ─── Audio level detection ───────────────────────────────────────────────
  const detectAudioLevel = (
    analyser: AnalyserNode,
    setIsTalking: (talking: boolean) => void
  ) => {
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    let silentFrames = 0;
    let isCurrentlyTalking = false;

    const checkAudioLevel = () => {
      analyser.getByteFrequencyData(dataArray);
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i] * dataArray[i];
      }
      const rms = Math.sqrt(sum / dataArray.length);

      if (rms > 25) {
        if (!isCurrentlyTalking) {
          setIsTalking(true);
          isCurrentlyTalking = true;
        }
        silentFrames = 0;
      } else {
        silentFrames++;
        if (silentFrames > 20 && isCurrentlyTalking) {
          setIsTalking(false);
          isCurrentlyTalking = false;
        }
      }
    };

    const interval = setInterval(checkAudioLevel, 100);
    return () => clearInterval(interval);
  };

  // ─── AudioContext: initialise once on first user gesture ────────────────
  const ensureAudioContext = () => {
    if (!audioContextRef.current) {
      const AudioContextClass =
        window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        audioContextRef.current = new AudioContextClass();
      }
    }
    if (audioContextRef.current?.state === 'suspended') {
      audioContextRef.current.resume();
    }
  };

  // ─── Socket setup ────────────────────────────────────────────────────────
  useEffect(() => {
    const newSocket = io(BACKEND_URL);
    socketRef.current = newSocket;
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('Connected to server');
    });

    newSocket.on('user-id', (id: string) => {
      setUserId(id);
      userIdRef.current = id;
    });

    newSocket.on('waiting-for-partner', () => {
      setConnectionStatus({ status: 'waiting', message: 'Looking for someone to talk to...' });
    });

    newSocket.on('partner-found', ({ partnerId }: { partnerId: string }) => {
      setPartnerId(partnerId);
      setIsInCall(true);
      setConnectionStatus({ status: 'connected', message: 'Connected! Say hello!' });
      initializeWebRTC(partnerId);
    });

    newSocket.on('call-ended', () => {
      endCall();
    });

    newSocket.on('partner-ended-call', (data: { message: string; timestamp: string }) => {
      setPartnerEndedMessage(data.message || 'Your partner ended the call');
      setShowPartnerEndedNotification(true);
      setConnectionStatus({
        status: 'disconnected',
        message: data.message || 'Your partner ended the call',
      });
      endCall();
      setTimeout(() => setShowPartnerEndedNotification(false), 5000);
    });

    newSocket.on('partner-disconnected', () => {
      setConnectionStatus({ status: 'disconnected', message: 'Your partner disconnected' });
      endCall();
    });

    newSocket.on('webrtc-signal', async ({ type, payload }: any) => {
      if (peerConnectionRef.current) {
        if (type === 'offer') await handleOffer(payload);
        else if (type === 'answer') await handleAnswer(payload);
        else if (type === 'ice-candidate') await handleIceCandidate(payload);
      }
    });

    newSocket.on('chat-message', (message: ChatMessage) => {
      const currentUserId = userIdRef.current;
      const isOwnMessage = message.senderId === currentUserId;
      setMessages((prev) => [...prev, { ...message, isOwn: isOwnMessage }]);
      if (!showChatRef.current && !isOwnMessage) {
        setUnreadCount((prev) => prev + 1);
      }
    });

    return () => {
      newSocket.close();
    };
  }, []);

  useEffect(() => {
    showChatRef.current = showChat;
    if (showChat) setUnreadCount(0);
  }, [showChat]);

  // ─── WebRTC initialisation ───────────────────────────────────────────────
  const initializeWebRTC = async (partnerId: string) => {
    try {
      console.log('Initializing WebRTC for partner:', partnerId);

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      localStreamRef.current = stream;
      console.log('Local stream obtained, tracks:', stream.getAudioTracks().length);

      // ── Local audio analyser (clone so we don't affect the sent stream) ──
      if (audioContextRef.current) {
        const clonedStream = stream.clone();
        const localSource = audioContextRef.current.createMediaStreamSource(clonedStream);
        const localAnalyser = audioContextRef.current.createAnalyser();
        localAnalyser.fftSize = 256;
        localSource.connect(localAnalyser);
        // Store refs to prevent GC
        localSourceRef.current = localSource;
        analyserRef.current = localAnalyser;
        detectAudioLevel(localAnalyser, setIsUserTalking);
      }

      // ── RTCPeerConnection ────────────────────────────────────────────────
      const configuration: RTCConfiguration = {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' },
          // Free TURN server — helps on networks that block peer-to-peer UDP
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
        ],
      };

      const peerConnection = new RTCPeerConnection(configuration);
      peerConnectionRef.current = peerConnection;

      // Add local tracks
      stream.getTracks().forEach((track) => {
        console.log('Adding local track:', track.kind, track.label);
        peerConnection.addTrack(track, stream);
      });

      // ICE candidates
      peerConnection.onicecandidate = (event) => {
        if (event.candidate && socketRef.current) {
          socketRef.current.emit('webrtc-signal', {
            type: 'ice-candidate',
            payload: event.candidate,
            targetUserId: partnerId,
          });
        }
      };

      peerConnection.onconnectionstatechange = () => {
        console.log('Connection state:', peerConnection.connectionState);
      };

      peerConnection.oniceconnectionstatechange = () => {
        console.log('ICE state:', peerConnection.iceConnectionState);
      };

      // ── Remote track handler ─────────────────────────────────────────────
      peerConnection.ontrack = (event) => {
        console.log('Remote track received:', event.streams[0]?.getTracks());

        const remoteAudio = document.getElementById('remoteAudio') as HTMLAudioElement;
        if (!remoteAudio) return;

        // FIX: Set srcObject — this is the ONLY playback path.
        //      Do NOT also connect to audioContext.destination (causes conflict).
        remoteAudio.srcObject = event.streams[0];
        remoteAudio.volume = 1.0;
        remoteAudio.muted = false;

        // Resume AudioContext first (may be suspended), then play
        const resumeAndPlay = () => {
          const ctx = audioContextRef.current;
          const resume = ctx?.state === 'suspended' ? ctx.resume() : Promise.resolve();
          resume
            .then(() => remoteAudio.play())
            .then(() => console.log('Remote audio playing'))
            .catch((e) => console.warn('play() error:', e));
        };

        // Try immediately; retry once on loadedmetadata in case srcObject wasn't ready
        resumeAndPlay();
        remoteAudio.onloadedmetadata = resumeAndPlay;

        // ── Analyser ONLY — do NOT call remoteSource.connect(destination) ──
        //    srcObject already routes audio to the speakers.
        if (audioContextRef.current && event.streams[0]) {
          const remoteSource = audioContextRef.current.createMediaStreamSource(
            event.streams[0]
          );
          const remoteAnalyser = audioContextRef.current.createAnalyser();
          remoteAnalyser.fftSize = 256;
          remoteSource.connect(remoteAnalyser);
          // Store ref to prevent GC
          remoteSourceRef.current = remoteSource;
          remoteAnalyserRef.current = remoteAnalyser;
          detectAudioLevel(remoteAnalyser, setIsPartnerTalking);
        }
      };

      // Create and send offer
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      if (socketRef.current) {
        socketRef.current.emit('webrtc-signal', {
          type: 'offer',
          payload: offer,
          targetUserId: partnerId,
        });
      }
    } catch (error: any) {
      console.error('Error in initializeWebRTC:', error);
      setConnectionStatus({
        status: 'disconnected',
        message: `Microphone error: ${error?.message || 'Unknown error'}`,
      });
      if (error?.name === 'NotAllowedError') {
        alert('Microphone access denied. Please allow microphone access in your browser settings.');
      } else if (error?.name === 'NotFoundError') {
        alert('No microphone found. Please connect a microphone and try again.');
      } else if (error?.name === 'NotReadableError') {
        alert('Microphone is being used by another application.');
      }
    }
  };

  // ─── WebRTC signalling handlers ──────────────────────────────────────────
  const handleOffer = async (offer: RTCSessionDescriptionInit) => {
    if (!peerConnectionRef.current) return;
    await peerConnectionRef.current.setRemoteDescription(offer);

    // Flush buffered ICE candidates
    for (const candidate of iceCandidates) {
      try {
        await peerConnectionRef.current.addIceCandidate(candidate);
      } catch (e) {
        console.warn('Buffered ICE candidate error:', e);
      }
    }
    setIceCandidates([]);

    const answer = await peerConnectionRef.current.createAnswer();
    await peerConnectionRef.current.setLocalDescription(answer);

    if (socketRef.current && partnerId) {
      socketRef.current.emit('webrtc-signal', {
        type: 'answer',
        payload: answer,
        targetUserId: partnerId,
      });
    }
  };

  const handleAnswer = async (answer: RTCSessionDescriptionInit) => {
    if (!peerConnectionRef.current) return;
    await peerConnectionRef.current.setRemoteDescription(answer);

    for (const candidate of iceCandidates) {
      try {
        await peerConnectionRef.current.addIceCandidate(candidate);
      } catch (e) {
        console.warn('Buffered ICE candidate error:', e);
      }
    }
    setIceCandidates([]);
  };

  const handleIceCandidate = async (candidate: RTCIceCandidateInit) => {
    if (!peerConnectionRef.current) return;
    if (peerConnectionRef.current.remoteDescription) {
      try {
        await peerConnectionRef.current.addIceCandidate(candidate);
      } catch (e) {
        console.warn('ICE candidate error (normal):', e);
      }
    } else {
      setIceCandidates((prev) => [...prev, candidate]);
    }
  };

  // ─── Call controls ───────────────────────────────────────────────────────
  const startChat = () => {
    // FIX: AudioContext MUST be created/resumed from a direct user gesture
    ensureAudioContext();

    if (socketRef.current) {
      setConnectionStatus({ status: 'connecting', message: 'Finding someone to talk to...' });
      socketRef.current.emit('find-partner');
    }
  };

  const endCall = () => {
    setIsInCall(false);
    setPartnerId(null);
    setMessages([]);
    setShowChat(false);
    setUnreadCount(0);
    setIceCandidates([]);
    setIsUserTalking(false);
    setIsPartnerTalking(false);

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    // Clean up audio nodes
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
  };

  const sendMessage = () => {
    if (messageInput.trim() && socketRef.current && isInCall) {
      socketRef.current.emit('chat-message', {
        text: messageInput,
        senderId: userId,
        timestamp: new Date().toISOString(),
      });
      setMessageInput('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const nextPartner = () => {
    if (socketRef.current) {
      socketRef.current.emit('next-partner');
    }
  };

  // ─── UI helpers ──────────────────────────────────────────────────────────
  const getStatusColor = () => {
    switch (connectionStatus.status) {
      case 'connected': return 'text-green-400';
      case 'waiting': return 'text-yellow-400';
      case 'connecting': return 'text-blue-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusIcon = () => {
    switch (connectionStatus.status) {
      case 'connected': return 'Connected';
      case 'waiting': return 'Searching';
      case 'connecting': return 'Connecting';
      default: return 'Ready';
    }
  };

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="w-full max-w-md">
      {/* Partner ended notification */}
      {showPartnerEndedNotification && (
        <div className="fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-pulse">
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <span className="font-medium">{partnerEndedMessage}</span>
          </div>
        </div>
      )}

      <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 shadow-2xl">
        {/* Status */}
        <div className="text-center mb-6">
          <div className={`text-sm font-medium ${getStatusColor()} mb-2`}>
            {getStatusIcon()}
          </div>
          <div className="text-white text-lg">{connectionStatus.message}</div>
        </div>

        {/* FIX: Hidden audio elements — no visible controls to avoid autoplay restrictions */}
        <audio id="remoteAudio" autoPlay playsInline className="hidden" />
        <audio id="localAudio" autoPlay muted playsInline className="hidden" />

        {/* Visual indicator */}
        <div className="flex justify-center mb-8">
          <div className="relative">
            {isUserTalking && isInCall && (
              <div className="absolute -top-2 -left-2 w-8 h-8 bg-blue-500 rounded-full animate-ping" />
            )}

            <div
              className={`w-32 h-32 rounded-full flex items-center justify-center relative overflow-hidden ${
                isInCall
                  ? isUserTalking
                    ? 'bg-blue-600 animate-pulse shadow-lg shadow-blue-500/50'
                    : isPartnerTalking
                    ? 'bg-green-500 animate-pulse shadow-lg shadow-green-500/50'
                    : 'bg-green-500'
                  : connectionStatus.status === 'waiting'
                  ? 'bg-yellow-500 animate-pulse'
                  : 'bg-gray-600'
              }`}
            >
              {isUserTalking && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="flex space-x-1">
                    {[0, 100, 200, 300, 400].map((delay) => (
                      <div
                        key={delay}
                        className={`w-1 bg-white/70 animate-pulse ${
                          delay === 100 || delay === 300 ? 'h-12' : delay === 0 || delay === 400 ? 'h-6' : 'h-8'
                        }`}
                        style={{ animationDelay: `${delay}ms` }}
                      />
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
                className={`w-16 h-16 text-white z-10 ${
                  isUserTalking || isPartnerTalking ? 'animate-bounce' : ''
                }`}
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z"
                  clipRule="evenodd"
                />
              </svg>
            </div>

            {isPartnerTalking && isInCall && (
              <div className="absolute -top-2 -right-2 w-8 h-8 bg-green-500 rounded-full animate-ping" />
            )}
          </div>
        </div>

        {/* Talking status */}
        {isInCall && (isUserTalking || isPartnerTalking) && (
          <div className="text-center mb-4 text-sm font-medium">
            {isUserTalking && (
              <span className="text-blue-400 animate-pulse">You're talking...</span>
            )}
            {isPartnerTalking && (
              <span className="text-green-400 animate-pulse">Partner is talking...</span>
            )}
          </div>
        )}

        {/* Chat toggle */}
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

        {/* Chat panel */}
        {showChat && isInCall && (
          <div className="mb-6 bg-black/30 rounded-xl p-4">
            <div className="h-48 overflow-y-auto mb-4 space-y-2">
              {messages.length === 0 ? (
                <div className="text-center text-gray-400 text-sm">
                  No messages yet. Start the conversation!
                </div>
              ) : (
                messages.map((msg, index) => (
                  <div key={index} className={`flex ${msg.isOwn ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[70%] px-3 py-2 rounded-lg text-sm ${
                        msg.isOwn ? 'bg-blue-600 text-white' : 'bg-yellow-500 text-black'
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type a message..."
                className="flex-1 px-3 py-2 bg-black/50 text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={sendMessage}
                className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-black rounded-lg text-sm font-medium transition-colors"
              >
                Send
              </button>
            </div>
          </div>
        )}

        {/* Volume control */}
        {isInCall && (
          <div className="flex justify-center mb-4">
            <div className="bg-black/30 rounded-lg p-3 flex items-center gap-3">
              <span className="text-white text-sm">Volume:</span>
              <input
                type="range"
                min="0"
                max="100"
                defaultValue="100"
                onChange={(e) => {
                  const remoteAudio = document.getElementById('remoteAudio') as HTMLAudioElement;
                  if (remoteAudio) remoteAudio.volume = parseInt(e.target.value) / 100;
                }}
                className="w-32 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>
        )}

        {/* Control buttons */}
        <div className="flex gap-4 justify-center">
          {!isInCall ? (
            <button
              onClick={startChat}
              disabled={
                connectionStatus.status === 'waiting' ||
                connectionStatus.status === 'connecting'
              }
              className="px-8 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-full font-medium transition-colors"
            >
              {connectionStatus.status === 'waiting' ||
              connectionStatus.status === 'connecting'
                ? 'Searching...'
                : 'Start Chat'}
            </button>
          ) : (
            <>
              <button
                onClick={() => {
                  if (socketRef.current) socketRef.current.emit('end-call');
                  endCall();
                }}
                className="px-8 py-3 bg-red-600 hover:bg-red-700 text-white rounded-full font-medium transition-colors"
              >
                End
              </button>
              <button
                onClick={nextPartner}
                className="px-8 py-3 bg-yellow-500 hover:bg-yellow-600 text-black rounded-full font-medium transition-colors"
              >
                Next
              </button>
            </>
          )}
        </div>

        {/* User ID */}
        {userId && (
          <div className="text-center mt-6 text-gray-400 text-sm">
            Your ID: {userId.slice(0, 8)}...
          </div>
        )}
      </div>
    </div>
  );
}