import { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import { useSocket } from './SocketContext';
import { useAuth } from './AuthContext';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'turn:openrelay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject' },
    { urls: 'turn:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' },
    { urls: 'turn:openrelay.metered.ca:443?transport=tcp', username: 'openrelayproject', credential: 'openrelayproject' },
  ],
};

const CallContext = createContext(null);

export function CallProvider({ children }) {
  const socket = useSocket();
  const { couple } = useAuth();

  const [status, setStatus] = useState('idle'); // idle | calling | incoming | connected
  const [callType, setCallType] = useState('audio');
  const [incomingData, setIncomingData] = useState(null);
  const [callError, setCallError] = useState('');
  const [isSpeaker, setIsSpeaker] = useState(false); // default: earpiece

  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const pendingCandidates = useRef([]);
  const audioCtxRef = useRef(null);

  // Video element refs — set by the Call page via callback refs
  const localVideoEl = useRef(null);
  const remoteVideoEl = useRef(null);

  const attachStreams = useCallback(() => {
    if (localVideoEl.current && localStreamRef.current) {
      localVideoEl.current.srcObject = localStreamRef.current;
    }
    if (remoteVideoEl.current && remoteStreamRef.current) {
      remoteVideoEl.current.srcObject = remoteStreamRef.current;
      remoteVideoEl.current.play().catch(() => {});
    }
  }, []);

  // Callback refs — Call page passes these to its <video> elements
  const localVideoRef = useCallback((el) => {
    localVideoEl.current = el;
    if (el && localStreamRef.current) {
      el.srcObject = localStreamRef.current;
    }
  }, []);

  const remoteVideoRef = useCallback((el) => {
    remoteVideoEl.current = el;
    if (el && remoteStreamRef.current) {
      el.srcObject = remoteStreamRef.current;
      el.play().catch(() => {});
    }
  }, []);

  const cleanup = useCallback(() => {
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    remoteStreamRef.current = null;
    pcRef.current?.close();
    pcRef.current = null;
    pendingCandidates.current = [];
    audioCtxRef.current?.close();
    audioCtxRef.current = null;
    if (localVideoEl.current) localVideoEl.current.srcObject = null;
    if (remoteVideoEl.current) remoteVideoEl.current.srcObject = null;
    setStatus('idle');
    setIncomingData(null);
    setCallError('');
    setIsSpeaker(false);
  }, []);

  const drainCandidates = async () => {
    while (pendingCandidates.current.length && pcRef.current) {
      const c = pendingCandidates.current.shift();
      try { await pcRef.current.addIceCandidate(new RTCIceCandidate(c)); } catch {}
    }
  };

  useEffect(() => {
    if (!socket || !couple) return;
    socket.emit('join-couple-room', couple.couple.id);

    const onIncoming = (data) => {
      setIncomingData(data);
      setCallType(data.callType || 'audio');
      setStatus('incoming');
    };

    const onAnswered = async ({ answer }) => {
      if (!pcRef.current) return;
      try {
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(answer));
        await drainCandidates();
        setStatus('connected');
      } catch (e) { console.error('answer err:', e); }
    };

    const onICE = async ({ candidate }) => {
      if (!candidate) return;
      if (!pcRef.current || !pcRef.current.remoteDescription) {
        pendingCandidates.current.push(candidate); return;
      }
      try { await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate)); } catch {}
    };

    socket.on('incoming-call', onIncoming);
    socket.on('call-answered', onAnswered);
    socket.on('webrtc-ice-candidate', onICE);
    socket.on('call-ended', cleanup);

    return () => {
      socket.off('incoming-call', onIncoming);
      socket.off('call-answered', onAnswered);
      socket.off('webrtc-ice-candidate', onICE);
      socket.off('call-ended', cleanup);
    };
  }, [socket, couple, cleanup]);

  const buildPC = (stream) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    stream.getTracks().forEach((t) => pc.addTrack(t, stream));
    pc.ontrack = (e) => {
      const remote = e.streams[0] || new MediaStream([e.track]);
      remoteStreamRef.current = remote;
      if (remoteVideoEl.current) {
        remoteVideoEl.current.srcObject = remote;
        remoteVideoEl.current.play().catch(() => {});
      }
    };
    pc.onicecandidate = (e) => {
      if (e.candidate && socket) socket.emit('webrtc-ice-candidate', { candidate: e.candidate });
    };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed') { setCallError('連線失敗，請重試'); cleanup(); }
    };
    return pc;
  };

  const getMedia = async (withVideo) => {
    try {
      return await navigator.mediaDevices.getUserMedia({ audio: true, video: withVideo });
    } catch {
      if (withVideo) return navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      throw new Error('無法存取麥克風，請確認權限設定。');
    }
  };

  const startCall = async (type) => {
    if (!socket || !couple) return;
    setCallError(''); setCallType(type); setStatus('calling');
    try {
      const stream = await getMedia(type === 'video');
      localStreamRef.current = stream;
      if (localVideoEl.current) localVideoEl.current.srcObject = stream;
      const pc = buildPC(stream);
      pcRef.current = pc;
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit('call-user', { offer, callType: type });
    } catch (err) {
      setCallError(err.message || '無法開始通話'); cleanup();
    }
  };

  const answerCall = async () => {
    if (!socket || !incomingData) return;
    setCallError('');
    try {
      const stream = await getMedia(callType === 'video');
      localStreamRef.current = stream;
      if (localVideoEl.current) localVideoEl.current.srcObject = stream;
      const pc = buildPC(stream);
      pcRef.current = pc;
      await pc.setRemoteDescription(new RTCSessionDescription(incomingData.offer));
      await drainCandidates();
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit('answer-call', { answer });
      setStatus('connected');
    } catch (err) {
      setCallError('接聽失敗，請重試'); cleanup();
    }
  };

  const endCall = () => {
    if (socket) socket.emit('end-call');
    cleanup();
  };

  const toggleSpeaker = async () => {
    const videoEl = remoteVideoEl.current;
    const stream = remoteStreamRef.current;
    if (!stream) return;

    const next = !isSpeaker;
    setIsSpeaker(next);

    if (next) {
      // Switch to speaker
      if (videoEl?.setSinkId) {
        try { await videoEl.setSinkId(''); } catch {}
      } else {
        // iOS fallback: AudioContext routes to speaker
        if (!audioCtxRef.current) {
          const Ctx = window.AudioContext || window.webkitAudioContext;
          if (Ctx) {
            const ctx = new Ctx();
            const src = ctx.createMediaStreamSource(stream);
            src.connect(ctx.destination);
            audioCtxRef.current = ctx;
            if (videoEl) videoEl.muted = true;
          }
        }
      }
    } else {
      // Switch to earpiece
      if (videoEl?.setSinkId) {
        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const ear = devices.find((d) => d.kind === 'audiooutput' && /ear|receiver/i.test(d.label));
          await videoEl.setSinkId(ear?.deviceId || 'communications');
        } catch { try { await videoEl.setSinkId('communications'); } catch {} }
      } else {
        // iOS: close AudioContext, unmute video
        if (audioCtxRef.current) {
          audioCtxRef.current.close();
          audioCtxRef.current = null;
          if (videoEl) videoEl.muted = false;
        }
      }
    }
  };

  return (
    <CallContext.Provider value={{
      status, callType, incomingData, callError, isSpeaker,
      startCall, answerCall, endCall, toggleSpeaker,
      localVideoRef, remoteVideoRef, attachStreams,
    }}>
      {children}
    </CallContext.Provider>
  );
}

export function useCall() {
  return useContext(CallContext);
}
