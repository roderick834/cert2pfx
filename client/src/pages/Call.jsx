import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';

// STUN + free public TURN for NAT traversal on mobile networks
const ICE_SERVERS = {
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
};

export default function Call() {
  const { couple } = useAuth();
  const socket = useSocket();
  const [status, setStatus] = useState('idle'); // idle | calling | incoming | connected
  const [callType, setCallType] = useState('audio');
  const [incomingData, setIncomingData] = useState(null);
  const [callError, setCallError] = useState('');
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  // Buffer ICE candidates that arrive before remote description is set
  const pendingCandidates = useRef([]);

  const cleanup = () => {
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    pcRef.current?.close();
    pcRef.current = null;
    pendingCandidates.current = [];
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    setStatus('idle');
    setIncomingData(null);
    setCallError('');
  };

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

    // Caller receives callee's answer
    const onAnswered = async ({ answer }) => {
      if (!pcRef.current) return;
      try {
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(answer));
        await drainCandidates();
        setStatus('connected');
      } catch (e) {
        console.error('setRemoteDescription(answer) failed:', e);
      }
    };

    // ICE candidates — buffer if PC not ready yet
    const onICE = async ({ candidate }) => {
      if (!candidate) return;
      if (!pcRef.current || !pcRef.current.remoteDescription) {
        pendingCandidates.current.push(candidate);
        return;
      }
      try { await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate)); } catch {}
    };

    const onEnded = () => cleanup();

    socket.on('incoming-call', onIncoming);
    socket.on('call-answered', onAnswered);
    socket.on('webrtc-ice-candidate', onICE);
    socket.on('call-ended', onEnded);

    return () => {
      socket.off('incoming-call', onIncoming);
      socket.off('call-answered', onAnswered);
      socket.off('webrtc-ice-candidate', onICE);
      socket.off('call-ended', onEnded);
    };
  }, [socket, couple]);

  const buildPC = (stream) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    stream.getTracks().forEach((t) => pc.addTrack(t, stream));

    pc.ontrack = (e) => {
      if (remoteVideoRef.current && e.streams[0]) {
        remoteVideoRef.current.srcObject = e.streams[0];
      }
    };

    pc.onicecandidate = (e) => {
      if (e.candidate && socket) {
        socket.emit('webrtc-ice-candidate', { candidate: e.candidate });
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed') {
        setCallError('連線失敗，請重試');
        cleanup();
      }
    };

    return pc;
  };

  const getMedia = async (withVideo) => {
    try {
      return await navigator.mediaDevices.getUserMedia({ audio: true, video: withVideo });
    } catch {
      // Video permission denied — fall back to audio only
      if (withVideo) return navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      throw new Error('無法存取麥克風，請確認權限設定。');
    }
  };

  const startCall = async (type) => {
    if (!socket || !couple) return;
    setCallError('');
    setCallType(type);
    setStatus('calling');
    try {
      const stream = await getMedia(type === 'video');
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      const pc = buildPC(stream);
      pcRef.current = pc;

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit('call-user', { offer, callType: type });
    } catch (err) {
      setCallError(err.message || '無法開始通話');
      cleanup();
    }
  };

  const answerCall = async () => {
    if (!socket || !incomingData) return;
    setCallError('');
    try {
      const stream = await getMedia(callType === 'video');
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      const pc = buildPC(stream);
      pcRef.current = pc;

      await pc.setRemoteDescription(new RTCSessionDescription(incomingData.offer));
      await drainCandidates();

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit('answer-call', { answer });
      setStatus('connected');
    } catch (err) {
      console.error('answerCall error:', err);
      setCallError('接聽失敗，請重試');
      cleanup();
    }
  };

  const endCall = () => {
    if (socket) socket.emit('end-call');
    cleanup();
  };

  if (!couple) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center px-8">
        <div className="text-5xl mb-4">📵</div>
        <p className="text-gray-500">請先連結另一半才能通話</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center min-h-[calc(100vh-8rem)] bg-gradient-to-b from-rose-50 to-white">
      {/* Video area — always rendered so refs stay attached */}
      <div
        className="relative w-full bg-black"
        style={{
          height: (status === 'connected' || status === 'calling') ? undefined : 0,
          maxHeight: 320,
          overflow: 'hidden',
        }}
      >
        <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
        <video
          ref={localVideoRef}
          autoPlay
          playsInline
          muted
          className="absolute bottom-3 right-3 w-24 h-16 object-cover rounded-xl border-2 border-white shadow-lg"
        />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 gap-6 w-full">
        {callError && (
          <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm w-full max-w-sm text-center">
            {callError}
          </div>
        )}

        {status === 'idle' && (
          <>
            <div className="w-20 h-20 rounded-full bg-rose-100 flex items-center justify-center text-3xl font-bold text-rose-500">
              {couple.partner?.username?.[0]?.toUpperCase() || '?'}
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-gray-700">{couple.partner?.username || '等待另一半...'}</p>
              <p className="text-sm text-gray-400 mt-1">在一起 {couple.daysTogether} 天 ❤️</p>
            </div>
            {couple.partner ? (
              <div className="flex gap-6">
                <button onClick={() => startCall('audio')} className="flex flex-col items-center gap-2">
                  <div className="w-16 h-16 rounded-full bg-green-500 hover:bg-green-600 flex items-center justify-center shadow-lg transition-all">
                    <span className="text-2xl">📞</span>
                  </div>
                  <span className="text-sm text-gray-500">語音通話</span>
                </button>
                <button onClick={() => startCall('video')} className="flex flex-col items-center gap-2">
                  <div className="w-16 h-16 rounded-full bg-rose-500 hover:bg-rose-600 flex items-center justify-center shadow-lg transition-all">
                    <span className="text-2xl">📹</span>
                  </div>
                  <span className="text-sm text-gray-500">視訊通話</span>
                </button>
              </div>
            ) : (
              <p className="text-gray-400 text-sm">另一半尚未加入</p>
            )}
          </>
        )}

        {status === 'calling' && (
          <div className="text-center space-y-4">
            <p className="text-2xl font-bold text-gray-700">{couple.partner?.username}</p>
            <p className="text-gray-400 animate-pulse">撥號中...</p>
            <button onClick={endCall} className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center shadow-lg mx-auto">
              <span className="text-2xl">📵</span>
            </button>
          </div>
        )}

        {status === 'incoming' && (
          <div className="text-center space-y-4 w-full max-w-sm">
            <div className="w-20 h-20 rounded-full bg-rose-100 flex items-center justify-center text-3xl font-bold text-rose-500 mx-auto animate-bounce">
              {incomingData?.from?.[0]?.toUpperCase() || '?'}
            </div>
            <p className="text-xl font-bold text-gray-700">{incomingData?.from}</p>
            <p className="text-gray-400">{callType === 'video' ? '視訊通話' : '語音通話'}來電...</p>
            <div className="flex justify-center gap-10">
              <button onClick={endCall} className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center shadow-lg">
                <span className="text-2xl">📵</span>
              </button>
              <button onClick={answerCall} className="w-16 h-16 rounded-full bg-green-500 hover:bg-green-600 flex items-center justify-center shadow-lg">
                <span className="text-2xl">📞</span>
              </button>
            </div>
          </div>
        )}

        {status === 'connected' && (
          <div className="text-center space-y-4">
            <p className="text-green-500 font-semibold">通話中 ❤️</p>
            <button onClick={endCall} className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center shadow-lg mx-auto">
              <span className="text-2xl">📵</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
