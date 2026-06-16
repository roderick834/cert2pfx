import { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import { useSocket } from './SocketContext';
import { useAuth } from './AuthContext';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun.cloudflare.com:3478' },
    { urls: 'turn:openrelay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject' },
    { urls: 'turn:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' },
    { urls: 'turn:openrelay.metered.ca:443?transport=tcp', username: 'openrelayproject', credential: 'openrelayproject' },
  ],
};

const CallContext = createContext(null);

export function CallProvider({ children }) {
  const socket = useSocket();
  const { couple } = useAuth();

  const [status, setStatus] = useState('idle');
  const [callType, setCallType] = useState('audio');
  const [incomingData, setIncomingData] = useState(null);
  const [callError, setCallError] = useState('');
  const [isSpeaker, setIsSpeaker] = useState(false);

  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const pendingCandidates = useRef([]);
  const audioCtxRef = useRef(null);
  // Persistent <audio> element lives in document.body, not inside any React component.
  // This means audio keeps playing when the user navigates away from the Call page.
  const remoteAudioRef = useRef(null);
  const localVideoEl = useRef(null);
  const remoteVideoEl = useRef(null);
  const ringtoneRef = useRef(null);

  const stopRingtone = () => {
    ringtoneRef.current?.stop();
    ringtoneRef.current = null;
  };

  const startRingtone = () => {
    stopRingtone();
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    let ctx;
    try { ctx = new Ctx(); } catch { return; }
    let nextTime = ctx.currentTime + 0.05;
    let stopped = false;
    let timerId;
    // 啵啵啵 — three quick bubble pops: freq slides 1400→200 Hz in 100ms
    function pop(t) {
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      osc.connect(env); env.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1400, t);
      osc.frequency.exponentialRampToValueAtTime(200, t + 0.1);
      env.gain.setValueAtTime(0.001, t);
      env.gain.linearRampToValueAtTime(0.5, t + 0.006);
      env.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
      osc.start(t); osc.stop(t + 0.12);
    }
    function burst(t) {
      pop(t + 0.00);
      pop(t + 0.22);
      pop(t + 0.44);
    }
    function tick() {
      if (stopped) return;
      while (nextTime < ctx.currentTime + 0.5) { burst(nextTime); nextTime += 1.8; }
      timerId = setTimeout(tick, 200);
    }
    ctx.resume().then(tick).catch(() => {});
    ringtoneRef.current = {
      stop() { stopped = true; clearTimeout(timerId); try { ctx.close(); } catch {} },
    };
  };

  useEffect(() => {
    const el = document.createElement('audio');
    el.autoplay = true;
    el.style.display = 'none';
    document.body.appendChild(el);
    remoteAudioRef.current = el;
    return () => {
      el.remove();
      remoteAudioRef.current = null;
    };
  }, []);

  const attachStreams = useCallback(() => {
    if (localVideoEl.current && localStreamRef.current) {
      localVideoEl.current.srcObject = localStreamRef.current;
    }
    if (remoteVideoEl.current && remoteStreamRef.current) {
      remoteVideoEl.current.muted = true;
      remoteVideoEl.current.srcObject = remoteStreamRef.current;
      remoteVideoEl.current.play().catch(() => {});
    }
  }, []);

  const localVideoRef = useCallback((el) => {
    localVideoEl.current = el;
    if (el && localStreamRef.current) el.srcObject = localStreamRef.current;
  }, []);

  const remoteVideoRef = useCallback((el) => {
    remoteVideoEl.current = el;
    if (el && remoteStreamRef.current) {
      el.muted = true; // audio handled by remoteAudioRef
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
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = null;
      remoteAudioRef.current.muted = false;
    }
    stopRingtone();
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
      startRingtone();
    };

    const onAnswered = async ({ answer }) => {
      if (!pcRef.current) return;
      stopRingtone(); // caller side: stop ringing now that partner answered
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
      // Audio → persistent element in document.body (survives navigation)
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = remote;
        remoteAudioRef.current.play().catch(() => {});
      }
      // Video → React video element (muted — no double audio)
      if (remoteVideoEl.current) {
        remoteVideoEl.current.muted = true;
        remoteVideoEl.current.srcObject = remote;
        remoteVideoEl.current.play().catch(() => {});
      }
    };
    pc.onicecandidate = (e) => {
      if (e.candidate && socket) socket.emit('webrtc-ice-candidate', { candidate: e.candidate });
    };
    pc.oniceconnectionstatechange = () => {
      // Attempt ICE restart on failure before giving up
      if (pc.iceConnectionState === 'failed') pc.restartIce?.();
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
    setCallError(''); setCallType(type);
    // Unlock audio element in user-gesture context before any await (iOS Safari requires this)
    if (remoteAudioRef.current) {
      remoteAudioRef.current.play().then(() => { if (remoteAudioRef.current) remoteAudioRef.current.pause(); }).catch(() => {});
    }
    setStatus('calling');
    startRingtone();
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
    stopRingtone();
    // Unlock audio element in user-gesture context before any await (iOS Safari requires this)
    if (remoteAudioRef.current) {
      remoteAudioRef.current.play().then(() => { if (remoteAudioRef.current) remoteAudioRef.current.pause(); }).catch(() => {});
    }
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
    const audioEl = remoteAudioRef.current;
    const stream = remoteStreamRef.current;
    if (!stream || !audioEl) return;

    const next = !isSpeaker;
    setIsSpeaker(next);

    if (next) {
      // Speaker: AudioContext forces audio to loudspeaker (works on iOS Safari)
      if (!audioCtxRef.current) {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (Ctx) {
          const ctx = new Ctx();
          const src = ctx.createMediaStreamSource(stream);
          src.connect(ctx.destination);
          audioCtxRef.current = ctx;
          audioEl.muted = true; // AudioContext handles output now
        }
      }
    } else {
      // Earpiece: close AudioContext, let audio element output normally
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
        audioCtxRef.current = null;
      }
      audioEl.muted = false;
      audioEl.srcObject = stream;
      audioEl.play().catch(() => {});
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
