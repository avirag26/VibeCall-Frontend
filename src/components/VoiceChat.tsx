'use client';

import { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
// Environment configuration - change 'development' to 'tunnel' when sharing
const isTunnel = true; // Set to true for Render deployment
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
    message: 'Click Start to find someone to talk to'
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

  // Audio level detection function
  const detectAudioLevel = (analyser: AnalyserNode, setIsTalking: (talking: boolean) => void) => {
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    let silentFrames = 0;
    let isCurrentlyTalking = false;
    
    const checkAudioLevel = () => {
      analyser.getByteFrequencyData(dataArray);
      
      // Calculate RMS (Root Mean Square) for better speech detection
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i] * dataArray[i];
      }
      const rms = Math.sqrt(sum / dataArray.length);
      
      // Log audio level for debugging
      if (rms > 5) {
        console.log('Audio level:', rms.toFixed(2));
      }
      
      // Higher threshold for actual speech detection (was 10, now 25)
      if (rms > 25) {
        if (!isCurrentlyTalking) {
          console.log('Speech detected - Starting animation');
          setIsTalking(true);
          isCurrentlyTalking = true;
        }
        silentFrames = 0;
      } else {
        silentFrames++;
        // Wait longer before considering silent (was 10, now 20 frames = 2 seconds)
        if (silentFrames > 20 && isCurrentlyTalking) {
          console.log('Silence detected - Stopping animation');
          setIsTalking(false);
          isCurrentlyTalking = false;
        }
      }
    };
    
    const interval = setInterval(checkAudioLevel, 100); // Check every 100ms
    return () => clearInterval(interval);
  };

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
      setConnectionStatus({
        status: 'waiting',
        message: 'Looking for someone to talk to...'
      });
    });

    newSocket.on('partner-found', ({ partnerId }: { partnerId: string }) => {
      setPartnerId(partnerId);
      setIsInCall(true);
      setConnectionStatus({
        status: 'connected',
        message: 'Connected! Say hello!'
      });
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
        message: data.message || 'Your partner ended the call'
      });
      endCall();
      
      // Hide notification after 5 seconds
      setTimeout(() => {
        setShowPartnerEndedNotification(false);
      }, 5000);
    });

    newSocket.on('partner-disconnected', () => {
      setConnectionStatus({
        status: 'disconnected',
        message: 'Your partner disconnected'
      });
      endCall();
    });

    newSocket.on('webrtc-signal', async ({ type, payload, fromUserId }: any) => {
      if (peerConnectionRef.current) {
        if (type === 'offer') {
          await handleOffer(payload);
        } else if (type === 'answer') {
          await handleAnswer(payload);
        } else if (type === 'ice-candidate') {
          await handleIceCandidate(payload);
        }
      }
    });

    newSocket.on('chat-message', (message: ChatMessage) => {
      // Add message with proper isOwn flag - compare with stored userId
      const currentUserId = userIdRef.current;
      const isOwnMessage = message.senderId === currentUserId;
      console.log('Chat message received:', { senderId: message.senderId, currentUserId, isOwnMessage });
      setMessages(prev => [...prev, { ...message, isOwn: isOwnMessage }]);
      
      // Increment unread count if chat is hidden and message is from partner
      if (!showChatRef.current && !isOwnMessage) {
        setUnreadCount(prev => prev + 1);
      }
    });

    return () => {
      newSocket.close();
    };
  }, []);

  // Sync showChat state with ref
  useEffect(() => {
    showChatRef.current = showChat;
    // Reset unread count when opening chat
    if (showChat) {
      setUnreadCount(0);
    }
  }, [showChat]);

  const initializeWebRTC = async (partnerId: string) => {
    try {
      console.log('🎤 Initializing WebRTC for partner:', partnerId);
      
      // Test audio permissions first
      console.log('Requesting microphone access...');
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioInputs = devices.filter(device => device.kind === 'audioinput');
        console.log('Available audio inputs:', audioInputs.length);
        audioInputs.forEach((device, index) => {
          console.log(`Audio input ${index}:`, device.label || 'Unknown device');
        });
      } catch (e) {
        console.log('Error enumerating devices:', e);
      }

      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      localStreamRef.current = stream;
      console.log('Local audio stream obtained:', stream);
      console.log('Audio tracks:', stream.getAudioTracks());
      
      // Test if we can actually get audio levels
      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length > 0) {
        console.log('Audio track enabled:', audioTracks[0].enabled);
        console.log('Audio track state:', audioTracks[0].readyState);
      }
      
      // Set up local audio (muted so you don't hear yourself)
      const localAudio = document.getElementById('localAudio') as HTMLAudioElement;
      if (localAudio) {
        localAudio.srcObject = stream;
        localAudio.volume = 0; // Muted
        localAudio.muted = true; // Muted - you should only hear remote partner, not yourself
        
        // Resume audio context if needed
        if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
          audioContextRef.current.resume();
        }
        
        localAudio.play().then(() => {
          console.log('✅ Local audio playing for testing');
        }).catch(e => {
          console.log('❌ Local audio play error:', e);
          // User needs to interact first
          console.log('🔊 Click anywhere to start audio');
        });
      }

      // Set up audio analysis for local stream without interfering with playback
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      // Clone the stream for analysis to avoid interfering with the original
      const clonedStream = stream.clone();
      const localSource = audioContextRef.current.createMediaStreamSource(clonedStream);
      const localAnalyser = audioContextRef.current.createAnalyser();
      localAnalyser.fftSize = 256;
      localSource.connect(localAnalyser);
      analyserRef.current = localAnalyser;
      
      // Start detecting user's audio levels
      detectAudioLevel(localAnalyser, setIsUserTalking);

      const configuration = {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' },
          { urls: 'stun:stun3.l.google.com:19302' },
          { urls: 'stun:stun4.l.google.com:19302' }
        ]
      };

      const peerConnection = new RTCPeerConnection(configuration);
      peerConnectionRef.current = peerConnection;

      // Add local stream with detailed debugging
      stream.getTracks().forEach(track => {
        console.log('Adding track to peer connection:', track.kind, track.label, track.enabled);
        peerConnection.addTrack(track, stream);
      });
      
      // Verify tracks were added
      const senderTracks = peerConnection.getSenders();
      console.log('Peer connection senders:', senderTracks.length);
      senderTracks.forEach((sender, index) => {
        console.log(`Sender ${index}:`, sender.track?.kind, sender.track?.enabled);
      });

      // Handle ICE candidates
      peerConnection.onicecandidate = (event) => {
        if (event.candidate && socketRef.current) {
          console.log('🧊 Sending ICE candidate:', event.candidate);
          socketRef.current.emit('webrtc-signal', {
            type: 'ice-candidate',
            payload: event.candidate,
            targetUserId: partnerId
          });
        }
      };

      // Handle connection state changes
      peerConnection.onconnectionstatechange = () => {
        console.log('🔗 Connection state:', peerConnection.connectionState);
      };

      // Handle ICE connection state
      peerConnection.oniceconnectionstatechange = () => {
        console.log('ICE connection state:', peerConnection.iceConnectionState);
      };

      // Handle remote stream
      peerConnection.ontrack = (event) => {
        console.log('Received remote stream:', event.streams[0]);
        console.log('Remote stream tracks:', event.streams[0].getTracks());
        event.streams[0].getTracks().forEach((track, index) => {
          console.log(`Remote track ${index}:`, track.kind, track.label, track.enabled);
        });
        
        const remoteAudio = document.getElementById('remoteAudio') as HTMLAudioElement;
        if (remoteAudio) {
          console.log('Setting remote audio srcObject');
          remoteAudio.srcObject = event.streams[0];
          remoteAudio.volume = 1.0; // Ensure full volume
          remoteAudio.muted = false; // Ensure not muted
          
          // Resume audio context if suspended (browser requirement)
          if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
            audioContextRef.current.resume().then(() => {
              console.log('Audio context resumed');
            });
          }
          
          // Play with retry logic
          const playAudio = async () => {
            try {
              await remoteAudio.play();
              console.log('✅ Remote audio playing successfully');
            } catch (e) {
              console.log('❌ Audio play error:', e);
              // Retry after user interaction
              const retryPlay = () => {
                remoteAudio.play().catch(err => console.log('Retry failed:', err));
                document.removeEventListener('click', retryPlay);
              };
              document.addEventListener('click', retryPlay, { once: true });
            }
          };
          playAudio();
          
          // Test if audio element is actually playing
          setTimeout(() => {
            console.log('Remote audio element state:', {
              paused: remoteAudio.paused,
              currentTime: remoteAudio.currentTime,
              readyState: remoteAudio.readyState
            });
          }, 1000);
          
          // Set up audio analysis for remote stream without interfering with playback
          if (audioContextRef.current && event.streams[0]) {
            // Clone the remote stream for analysis to avoid interfering with the original
            const clonedRemoteStream = event.streams[0].clone();
            const remoteSource = audioContextRef.current.createMediaStreamSource(clonedRemoteStream);
            const remoteAnalyser = audioContextRef.current.createAnalyser();
            remoteAnalyser.fftSize = 256;
            remoteSource.connect(remoteAnalyser);
            remoteAnalyserRef.current = remoteAnalyser;
            
            // Start detecting partner's audio levels
            detectAudioLevel(remoteAnalyser, setIsPartnerTalking);
          }
        }
      };

      // Create and send offer
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      
      if (socketRef.current) {
        socketRef.current.emit('webrtc-signal', {
          type: 'offer',
          payload: offer,
          targetUserId: partnerId
        });
      }
    } catch (error: any) {
      console.error('❌ Error accessing microphone:', error);
      setConnectionStatus({
        status: 'disconnected',
        message: `Microphone error: ${error?.message || 'Unknown error'}`
      });
      
      // Show user-friendly error messages
      if (error?.name === 'NotAllowedError') {
        alert('🎤 Microphone access denied. Please allow microphone access in your browser settings.');
      } else if (error?.name === 'NotFoundError') {
        alert('🎤 No microphone found. Please connect a microphone and try again.');
      } else if (error?.name === 'NotReadableError') {
        alert('🎤 Microphone is being used by another application.');
      }
    }
  };

  const handleOffer = async (offer: RTCSessionDescriptionInit) => {
    if (peerConnectionRef.current) {
      await peerConnectionRef.current.setRemoteDescription(offer);
      
      // Add any buffered ICE candidates
      iceCandidates.forEach(async (candidate) => {
        try {
          await peerConnectionRef.current!.addIceCandidate(candidate);
        } catch (error) {
          console.log('Error adding buffered ICE candidate:', error);
        }
      });
      setIceCandidates([]);
      
      const answer = await peerConnectionRef.current.createAnswer();
      await peerConnectionRef.current.setLocalDescription(answer);
      
      if (socketRef.current && partnerId) {
        socketRef.current.emit('webrtc-signal', {
          type: 'answer',
          payload: answer,
          targetUserId: partnerId
        });
      }
    }
  };

  const handleAnswer = async (answer: RTCSessionDescriptionInit) => {
    if (peerConnectionRef.current) {
      await peerConnectionRef.current.setRemoteDescription(answer);
      
      // Add any buffered ICE candidates
      iceCandidates.forEach(async (candidate) => {
        try {
          await peerConnectionRef.current!.addIceCandidate(candidate);
        } catch (error) {
          console.log('Error adding buffered ICE candidate:', error);
        }
      });
      setIceCandidates([]);
    }
  };

  const handleIceCandidate = async (candidate: RTCIceCandidateInit) => {
    if (peerConnectionRef.current) {
      if (peerConnectionRef.current.remoteDescription) {
        try {
          await peerConnectionRef.current.addIceCandidate(candidate);
        } catch (error) {
          console.log('Error adding ICE candidate (this is normal):', error);
        }
      } else {
        // Buffer ICE candidates until remote description is set
        setIceCandidates(prev => [...prev, candidate]);
      }
    }
  };

  const startChat = () => {
    if (socketRef.current) {
      setConnectionStatus({
        status: 'connecting',
        message: 'Finding someone to talk to...'
      });
      socketRef.current.emit('find-partner');
    }
  };

  const endCall = () => {
    setIsInCall(false);
    setPartnerId(null);
    setMessages([]);
    setShowChat(false);
    setUnreadCount(0); // Reset unread count
    setIceCandidates([]);
    
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    
    const remoteAudio = document.getElementById('remoteAudio') as HTMLAudioElement;
    if (remoteAudio) {
      remoteAudio.srcObject = null;
    }
    
    setConnectionStatus({
      status: 'disconnected',
      message: 'Click Start to find someone to talk to'
    });
  };

  const sendMessage = () => {
    if (messageInput.trim() && socketRef.current && isInCall) {
      // Send to server only - server will broadcast to both users
      socketRef.current.emit('chat-message', {
        text: messageInput,
        senderId: userId,
        timestamp: new Date().toISOString()
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

  return (
    <div className="w-full max-w-md">
      {/* Partner Ended Call Notification */}
      {showPartnerEndedNotification && (
        <div className="fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-pulse">
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span className="font-medium">{partnerEndedMessage}</span>
          </div>
        </div>
      )}
      
      <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 shadow-2xl">
        {/* Status Display */}
        <div className="text-center mb-6">
          <div className={`text-sm font-medium ${getStatusColor()} mb-2`}>
            {getStatusIcon()}
          </div>
          <div className="text-white text-lg">
            {connectionStatus.message}
          </div>
        </div>

        {/* Audio Elements */}
        <audio id="remoteAudio" autoPlay playsInline className="hidden" />
        <audio id="localAudio" autoPlay muted playsInline className="hidden" />
        
        {/* Visual Indicator */}
        <div className="flex justify-center mb-8">
          <div className="relative">
            {/* User talking indicator */}
            {isUserTalking && isInCall && (
              <div className="absolute -top-2 -left-2 w-8 h-8 bg-blue-500 rounded-full animate-ping" />
            )}
            
            {/* Main circle */}
            <div className={`w-32 h-32 rounded-full flex items-center justify-center relative overflow-hidden ${
              isInCall 
                ? isUserTalking 
                  ? 'bg-blue-600 animate-pulse shadow-lg shadow-blue-500/50'
                  : isPartnerTalking
                  ? 'bg-green-500 animate-pulse shadow-lg shadow-green-500/50'
                  : 'bg-green-500'
                : connectionStatus.status === 'waiting'
                ? 'bg-yellow-500 animate-pulse'
                : 'bg-gray-600'
            }`}>
              {/* Audio waves animation when talking */}
              {isUserTalking && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="flex space-x-1">
                    <div className="w-1 h-8 bg-white/60 animate-pulse" style={{ animationDelay: '0ms' }} />
                    <div className="w-1 h-12 bg-white/80 animate-pulse" style={{ animationDelay: '100ms' }} />
                    <div className="w-1 h-6 bg-white/60 animate-pulse" style={{ animationDelay: '200ms' }} />
                    <div className="w-1 h-10 bg-white/80 animate-pulse" style={{ animationDelay: '300ms' }} />
                    <div className="w-1 h-4 bg-white/60 animate-pulse" style={{ animationDelay: '400ms' }} />
                  </div>
                </div>
              )}
              
              {/* Partner receiving animation */}
              {isPartnerTalking && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-full h-full rounded-full border-4 border-green-300 animate-pulse" />
                </div>
              )}
              
              {/* Microphone icon */}
              <svg className={`w-16 h-16 text-white z-10 ${isUserTalking || isPartnerTalking ? 'animate-bounce' : ''}`} fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
              </svg>
            </div>
            
            {/* Partner talking indicator */}
            {isPartnerTalking && isInCall && (
              <div className="absolute -top-2 -right-2 w-8 h-8 bg-green-500 rounded-full animate-ping" />
            )}
          </div>
        </div>

        {/* Talking Status Indicator */}
        {isInCall && (isUserTalking || isPartnerTalking) && (
          <div className="text-center mb-4">
            <div className="text-sm font-medium">
              {isUserTalking && (
                <span className="text-blue-400 animate-pulse">You're talking...</span>
              )}
              {isPartnerTalking && (
                <span className="text-green-400 animate-pulse">Partner is talking...</span>
              )}
            </div>
          </div>
        )}

        {/* Chat Toggle Button (only show when in call) */}
        {isInCall && (
          <div className="flex justify-center mb-4">
            <button
              onClick={() => setShowChat(!showChat)}
              className="relative px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-black rounded-full text-sm font-medium transition-colors"
            >
              {showChat ? 'Hide Chat' : 'Show Chat'}
              {/* Notification badge - only show when chat is hidden and there are unread messages */}
              {!showChat && unreadCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center animate-bounce">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          </div>
        )}

        {/* Chat Interface */}
        {showChat && isInCall && (
          <div className="mb-6 bg-black/30 rounded-xl p-4">
            <div className="h-48 overflow-y-auto mb-4 space-y-2">
              {messages.length === 0 ? (
                <div className="text-center text-gray-400 text-sm">
                  No messages yet. Start the conversation!
                </div>
              ) : (
                messages.map((msg, index) => (
                  <div
                    key={index}
                    className={`flex ${msg.isOwn ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[70%] px-3 py-2 rounded-lg text-sm ${
                        msg.isOwn
                          ? 'bg-blue-600 text-white'
                          : 'bg-yellow-500 text-black'
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

        {/* Control Buttons */}
        <div className="flex gap-4 justify-center">
          {!isInCall ? (
            <button
              onClick={startChat}
              disabled={connectionStatus.status === 'waiting' || connectionStatus.status === 'connecting'}
              className="px-8 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-full font-medium transition-colors"
            >
              {connectionStatus.status === 'waiting' || connectionStatus.status === 'connecting' 
                ? 'Searching...' 
                : 'Start Chat'
              }
            </button>
          ) : (
            <>
              <button
                onClick={() => {
                  // Notify server first, then end locally
                  if (socketRef.current) {
                    socketRef.current.emit('end-call');
                  }
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

        {/* User Info */}
        {userId && (
          <div className="text-center mt-6 text-gray-400 text-sm">
            Your ID: {userId.slice(0, 8)}...
          </div>
        )}
      </div>
    </div>
  );
}
