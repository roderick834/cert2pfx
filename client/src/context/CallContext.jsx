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

// Pre-render 啵啵啵 ringtone as a looping WAV blob so <audio> can play it
// in the background (AudioContext gets suspended when app is backgrounded).
async function buildRingtoneUrl() {
  const Ctx = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  if (!Ctx) return null;
  const sr = 22050;
  const dur = 1.8; // one 啵啵啵 cycle (3 pops + silence)
  const ctx = new Ctx(1, Math.ceil(sr * dur), sr);
  const pop = (t) => {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.type = 'sine';
    o.frequency.setValueAtTime(1400, t);
    o.frequency.exponentialRampToValueAtTime(200, t + 0.1);
    g.gain.setValueAtTime(0.001, t);
    g.gain.linearRampToValueAtTime(0.5, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    o.start(t); o.stop(t + 0.12);
  };
  pop(0.0); pop(0.22); pop(0.44);
  const buf = await ctx.startRendering();
  const pcm = buf.getChannelData(0);
  const dataLen = pcm.length * 2;
  const ab = new ArrayBuffer(44 + dataLen);
  const dv = new DataView(ab);
  const w = (o, s) => { for (let i = 0; i < s.length; i++) dv.setUint8(o + i, s.charCodeAt(i)); };
  w(0, 'RIFF'); dv.setUint32(4, 36 + dataLen, true);
  w(8, 'WAVE'); w(12, 'fmt ');
  dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 1, true);
  dv.setUint32(24, sr, true); dv.setUint32(28, sr * 2, true);
  dv.setUint16(32, 2, true); dv.setUint16(34, 16, true);
  w(36, 'data'); dv.setUint32(40, dataLen, true);
  for (let i = 0; i < pcm.length; i++)
    dv.setInt16(44 + i * 2, Math.max(-32767, Math.min(32767, pcm[i] * 32767)) | 0, true);
  return URL.createObjectURL(new Blob([ab], { type: 'audio/wav' }));
}

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

  // Persistent <audio> element for remote call audio.
  // Lives in document.body so it survives page navigation.
  // On iOS with getUserMedia active, <audio> routes to earpiece (playAndRecord session).
  const remoteAudioRef = useRef(null);
  // Separate looping <audio> element for ringtone (can play in background unlike AudioContext)
  const ringtoneAudioRef = useRef(null);

  const localVideoEl = useRef(null);
  const remoteVideoEl = useRef(null);

  useEffect(() => {
    const el = document.createElement('audio');
    el.autoplay = true;
    el.style.display = 'none';
    document.body.appendChild(el);
    remoteAudioRef.current = el;
    return () => { el.remove(); remoteAudioRef.current = null; };
  }, []);

  // Ringtone <audio> element — pre-render WAV and unlock on first user gesture
  useEffect(() => {
    const el = document.createElement('audio');
    el.loop = true;
    el.style.display = 'none';
    document.body.appendChild(el);
    ringtoneAudioRef.current = el;

    buildRingtoneUrl().then(url => {
      if (url && ringtoneAudioRef.current) ringtoneAudioRef.current.src = url;
    }).catch(() => {});

    // Unlock on first touch/click so it can play without a gesture later
    const unlock = () => {
      const r = ringtoneAudioRef.current;
      if (r) r.play().then(() => r.pause()).catch(() => {});
    };
    document.addEventListener('touchstart', unlock, { once: true, capture: true });
    document.addEventListener('click', unlock, { once: true, capture: true });

    return () => { el.remove(); ringtoneAudioRef.current = null; };
  }, []);

  const stopRingtone = () => {
    const r = ringtoneAudioRef.current;
    if (r && !r.paused) { r.pause(); r.currentTime = 0; }
  };

  const startRingtone = () => {
    const r = ringtoneAudioRef.current;
    if (!r || !r.src) return;
    r.currentTime = 0;
    r.play().catch(() => {});
  };

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
      el.muted = true; // audio handled by remoteAudioRef audio element
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

  const coupleId = couple?.couple?.id;
  useEffect(() => {
    if (!socket || !coupleId) return;
    socket.emit('join-couple-room', coupleId);

    const onIncoming = (data) => {
      setIncomingData(data);
      setCallType(data.callType || 'audio');
      setStatus('incoming');
      startRingtone();
    };

    const onAnswered = async ({ answer }) => {
      if (!pcRef.current) return;
      stopRingtone(); // caller side: stop ringing as soon as partner picks up
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
  }, [socket, coupleId, cleanup]);

  const buildPC = (stream) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    stream.getTracks().forEach((t) => pc.addTrack(t, stream));
    pc.ontrack = (e) => {
      const remote = e.streams[0] || new MediaStream([e.track]);
      remoteStreamRef.current = remote;
      // Audio → persistent <audio> element (earpiece on iOS via playAndRecord session)
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = remote;
        remoteAudioRef.current.play().catch(() => {});
      }
      // Video → visible React video element (muted — audio handled above)
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
    // Unlock ringtone in user-gesture context so it can play later (iOS Safari).
    // Do NOT pre-play remoteAudioRef here — playing it in a gesture handler locks
    // iOS into "media playback" speaker routing; instead let it play via autoplay
    // when the stream arrives (iOS exempts WebRTC streams from autoplay blocking).
    if (ringtoneAudioRef.current) {
      ringtoneAudioRef.current.play().then(() => { if (ringtoneAudioRef.current) ringtoneAudioRef.current.pause(); }).catch(() => {});
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
    // Do NOT pre-play remoteAudioRef here — same reason as startCall:
    // gesture-context play locks iOS into speaker routing for that element.
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
      // Speaker: mute <audio> first, then AudioContext routes to loudspeaker
      audioEl.muted = true;
      if (!audioCtxRef.current) {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (Ctx) {
          const ctx = new Ctx();
          ctx.createMediaStreamSource(stream).connect(ctx.destination);
          audioCtxRef.current = ctx;
        }
      }
    } else {
      // Earpiece: close AudioContext, then null-reset srcObject so iOS
      // re-evaluates AVAudioSession output port (earpiece in playAndRecord mode).
      if (audioCtxRef.current) {
        try { await audioCtxRef.current.close(); } catch {}
        audioCtxRef.current = null;
      }
      audioEl.muted = false;
      audioEl.pause();
      audioEl.srcObject = null;
      // Brief gap lets iOS commit the routing change before we re-attach stream
      await new Promise(r => setTimeout(r, 80));
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
