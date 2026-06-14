import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';

const ICE_SERVERS = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
};

export default function Call() {
  const { user, couple } = useAuth();
  const socket = useSocket();
  const [status, setStatus] = useState('idle'); // idle | calling | incoming | connected
  const [callType, setCallType] = useState('audio'); // audio | video
  const [incomingData, setIncomingData] = useState(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);

  const cleanup = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    setStatus('idle');
    setIncomingData(null);
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
      if (pcRef.current) {
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(answer));
        setStatus('connected');
      }
    };

    const onOffer = async ({ offer }) => {
      // handled in incoming flow
    };

    const onICE = async ({ candidate }) => {
      if (pcRef.current && candidate) {
        try { await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate)); } catch {}
      }
    };

    const onEnded = () => cleanup();

    socket.on('incoming-call', onIncoming);
    socket.on('call-answered', onAnswered);
    socket.on('webrtc-offer', onOffer);
    socket.on('webrtc-ice-candidate', onICE);
    socket.on('call-ended', onEnded);

    return () => {
      socket.off('incoming-call', onIncoming);
      socket.off('call-answered', onAnswered);
      socket.off('webrtc-offer', onOffer);
      socket.off('webrtc-ice-candidate', onICE);
      socket.off('call-ended', onEnded);
    };
  }, [socket, couple]);

  const createPC = (stream) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    stream.getTracks().forEach((t) => pc.addTrack(t, stream));
    pc.ontrack = (e) => {
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = e.streams[0];
    };
    pc.onicecandidate = (e) => {
      if (e.candidate && socket) {
        socket.emit('webrtc-ice-candidate', { candidate: e.candidate });
      }
    };
    return pc;
  };

  const startCall = async (type) => {
    if (!socket || !couple) return;
    setCallType(type);
    setStatus('calling');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: type === 'video'
      });
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      const pc = createPC(stream);
      pcRef.current = pc;
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socket.emit('call-user', { offer, callType: type });
    } catch (err) {
      console.error(err);
      cleanup();
      alert('無法存取媒體裝置，請確認麥克風/攝影機權限。');
    }
  };

  const answerCall = async () => {
    if (!socket || !incomingData) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: callType === 'video'
      });
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      const pc = createPC(stream);
      pcRef.current = pc;
      await pc.setRemoteDescription(new RTCSessionDescription(incomingData.offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit('answer-call', { answer });
      setStatus('connected');
    } catch (err) {
      console.error(err);
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
      {/* Video views */}
      {(status === 'connected' || status === 'calling') && (
        <div className="relative w-full bg-black" style={{ height: '55vw', maxHeight: 320 }}>
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="absolute bottom-3 right-3 w-24 h-16 object-cover rounded-xl border-2 border-white shadow-lg"
          />
        </div>
      )}

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 gap-6 w-full">
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
                <button
                  onClick={() => startCall('audio')}
                  className="flex flex-col items-center gap-2"
                >
                  <div className="w-16 h-16 rounded-full bg-green-500 hover:bg-green-600 flex items-center justify-center shadow-lg transition-all">
                    <span className="text-2xl">📞</span>
                  </div>
                  <span className="text-sm text-gray-500">語音通話</span>
                </button>
                <button
                  onClick={() => startCall('video')}
                  className="flex flex-col items-center gap-2"
                >
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
            <button
              onClick={endCall}
              className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center shadow-lg mx-auto"
            >
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
              <button
                onClick={endCall}
                className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center shadow-lg"
              >
                <span className="text-2xl">📵</span>
              </button>
              <button
                onClick={answerCall}
                className="w-16 h-16 rounded-full bg-green-500 hover:bg-green-600 flex items-center justify-center shadow-lg"
              >
                <span className="text-2xl">📞</span>
              </button>
            </div>
          </div>
        )}

        {status === 'connected' && (
          <div className="text-center space-y-4">
            <p className="text-green-500 font-semibold">通話中 ❤️</p>
            <button
              onClick={endCall}
              className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center shadow-lg mx-auto"
            >
              <span className="text-2xl">📵</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
