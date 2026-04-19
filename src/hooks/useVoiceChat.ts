import { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import type { Socket } from 'socket.io-client';
import { ConnectionStatus, ChatMessage } from '../types/chat';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://vibecall-backend-t5we.onrender.com';

export function useVoiceChat() {
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
  const [isMuted, setIsMuted] = useState(false);

  // All mutable state lives in refs so socket callbacks never see stale values
  const socketRef = useRef<Socket | null>(null);
  const userIdRef = useRef<string | null>(null);
  const partnerIdRef = useRef<string | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const iceCandidateBufferRef = useRef<RTCIceCandidateInit[]>([]);
  const showChatRef = useRef<boolean>(false);
  const isInCallRef = useRef<boolean>(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const localSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const remoteSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

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

  // ── Teardown ──────────────────────────────────────────────────────────────
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
    setIsMuted(false);

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
  const flushIceCandidates = async (pc: RTCPeerConnection) => {
    for (const c of iceCandidateBufferRef.current) {
      try { await pc.addIceCandidate(c); }
      catch (e) { console.warn('Buffered ICE error:', e); }
    }
    iceCandidateBufferRef.current = [];
  };

  const addIceCandidate = async (candidate: RTCIceCandidateInit) => {
    const pc = peerConnectionRef.current;
    if (!pc) return;
    if (pc.remoteDescription) {
      try { await pc.addIceCandidate(candidate); }
      catch (e) { console.warn('ICE add error:', e); }
    } else {
      iceCandidateBufferRef.current.push(candidate);
    }
  };

  // ── Build the RTCPeerConnection (shared setup for both peers) ─────────────
  const buildPeerConnection = (partnerId: string): RTCPeerConnection => {
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

    pc.onicecandidate = ({ candidate }) => {
      if (candidate && socketRef.current) {
        socketRef.current.emit('webrtc-signal', {
          type: 'ice-candidate',
          payload: candidate,
          targetUserId: partnerIdRef.current,
        });
      }
    };

    pc.onconnectionstatechange = () => console.log('PC state:', pc.connectionState);
    pc.oniceconnectionstatechange = () => console.log('ICE state:', pc.iceConnectionState);

    pc.ontrack = (event) => {
      console.log('Remote track received');
      const remoteAudio = document.getElementById('remoteAudio') as HTMLAudioElement;
      if (!remoteAudio) return;

      // srcObject is the ONE AND ONLY playback path — never connect to destination
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
        detectAudioLevel(analyser, setIsPartnerTalking);
      }
    };

    return pc;
  };

  // ── Caller: gets mic, builds PC, sends offer ──────────────────────────────
  const startAsCaller = async (partnerId: string) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      localStreamRef.current = stream;
      setupLocalAnalyser(stream);

      const pc = buildPeerConnection(partnerId);
      peerConnectionRef.current = pc;
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      console.log('Caller: sending offer');
      socketRef.current?.emit('webrtc-signal', {
        type: 'offer',
        payload: offer,
        targetUserId: partnerId,
      });
    } catch (err: any) {
      handleMicError(err);
    }
  };

  // ── Callee: gets mic, builds PC, waits for offer ──────────────────────────
  const startAsCallee = async (partnerId: string) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      localStreamRef.current = stream;
      setupLocalAnalyser(stream);

      const pc = buildPeerConnection(partnerId);
      peerConnectionRef.current = pc;
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));
      // PC is ready — handleOffer() will do the rest when the offer arrives
      console.log('Callee: waiting for offer');
    } catch (err: any) {
      handleMicError(err);
    }
  };

  const setupLocalAnalyser = (stream: MediaStream) => {
    if (!audioContextRef.current) return;
    const src = audioContextRef.current.createMediaStreamSource(stream.clone());
    const analyser = audioContextRef.current.createAnalyser();
    analyser.fftSize = 256;
    src.connect(analyser);
    localSourceRef.current = src;
    detectAudioLevel(analyser, setIsUserTalking);
  };

  const handleMicError = (err: any) => {
    console.error('Mic error:', err);
    setConnectionStatus({ status: 'disconnected', message: `Mic error: ${err?.message}` });
    if (err?.name === 'NotAllowedError') alert('Microphone access denied. Please allow it in browser settings.');
    else if (err?.name === 'NotFoundError') alert('No microphone found.');
    else if (err?.name === 'NotReadableError') alert('Microphone is in use by another app.');
  };

  // ── Signalling handlers ───────────────────────────────────────────────────
  const handleOffer = async (offer: RTCSessionDescriptionInit) => {
    const pc = peerConnectionRef.current;
    if (!pc) {
      console.warn('handleOffer: no peer connection yet');
      return;
    }
    console.log('Callee: received offer, creating answer');
    await pc.setRemoteDescription(offer);
    await flushIceCandidates(pc);

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    socketRef.current?.emit('webrtc-signal', {
      type: 'answer',
      payload: answer,
      targetUserId: partnerIdRef.current,
    });
  };

  const handleAnswer = async (answer: RTCSessionDescriptionInit) => {
    const pc = peerConnectionRef.current;
    if (!pc) return;
    // Guard: only set if we're in the right state (have-local-offer)
    if (pc.signalingState !== 'have-local-offer') {
      console.warn('handleAnswer: wrong state:', pc.signalingState, '— ignoring');
      return;
    }
    console.log('Caller: received answer');
    await pc.setRemoteDescription(answer);
    await flushIceCandidates(pc);
  };

  // ── Socket setup ──────────────────────────────────────────────────────────
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
      partnerIdRef.current = partnerId;
      isInCallRef.current = true;
      setIsInCall(true);
      setConnectionStatus({ status: 'connected', message: 'Connected! Say hello!' });

      const myId = userIdRef.current ?? '';
      const isCaller = myId < partnerId;
      console.log(isCaller ? 'Role: CALLER (sending offer)' : 'Role: CALLEE (waiting for offer)');

      if (isCaller) {
        startAsCaller(partnerId);
      } else {
        startAsCallee(partnerId);
      }
    });

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

  const stopSearching = () => {
    socketRef.current?.emit('stop-searching');
    setConnectionStatus({ status: 'disconnected', message: 'Click Start to find someone to talk to' });
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

  const toggleMute = () => {
    const stream = localStreamRef.current;
    if (stream) {
      const audioTracks = stream.getAudioTracks();
      const currentMuted = !audioTracks[0]?.enabled; // if enabled is false, it means it's muted
      audioTracks.forEach(track => track.enabled = currentMuted);
      setIsMuted(!currentMuted);
    }
  };

  return {
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
    isMuted,
    startChat,
    stopSearching,
    endCall,
    nextPartner,
    sendMessage,
    handleKeyPress,
    toggleMute,
  };
}
