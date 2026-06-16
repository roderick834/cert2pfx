import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCall } from '../context/CallContext';

export default function Call() {
  const { couple } = useAuth();
  const {
    status, callType, incomingData, callError, isSpeaker,
    startCall, answerCall, endCall, toggleSpeaker,
    localVideoRef, remoteVideoRef,
  } = useCall();
  const [isFullscreen, setIsFullscreen] = useState(false);

  if (!couple) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center px-8">
        <div className="text-5xl mb-4">📵</div>
        <p className="text-gray-500">請先連結另一半才能通話</p>
      </div>
    );
  }

  const showVideo = status === 'connected' || status === 'calling';

  return (
    <div className="flex flex-col items-center min-h-[calc(100vh-8rem)] bg-gradient-to-b from-rose-50 to-white">
      {/* Video container — CSS-only fullscreen toggle so refs stay on the same elements */}
      <div
        className={isFullscreen
          ? 'fixed inset-0 z-50 bg-black'
          : 'relative w-full bg-black overflow-hidden'}
        style={isFullscreen ? undefined : {
          height: showVideo ? '55vw' : 0,
          maxHeight: showVideo ? 320 : 0,
          transition: 'height 0.2s',
        }}
        onClick={() => showVideo && setIsFullscreen((f) => !f)}
      >
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
          style={{ background: '#000' }}
        />
        <video
          ref={localVideoRef}
          autoPlay
          playsInline
          muted
          className="absolute bottom-3 right-3 w-24 h-16 object-cover rounded-xl border-2 border-white shadow-lg bg-black"
        />
        {showVideo && !isFullscreen && (
          <div className="absolute bottom-3 left-3 bg-black/40 rounded-lg px-2 py-1 pointer-events-none">
            <span className="text-white text-xs">點擊全螢幕</span>
          </div>
        )}
        {isFullscreen && (
          <button
            onClick={(e) => { e.stopPropagation(); setIsFullscreen(false); }}
            className="absolute top-10 right-4 w-10 h-10 bg-black/60 rounded-full flex items-center justify-center text-white text-xl font-bold z-10"
          >
            ✕
          </button>
        )}
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
            <div className="flex gap-5 justify-center items-end">
              <button onClick={toggleSpeaker} className="flex flex-col items-center gap-1">
                <div className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all ${
                  isSpeaker ? 'bg-blue-500' : 'bg-gray-200'
                }`}>
                  <span className="text-2xl">{isSpeaker ? '🔊' : '🔈'}</span>
                </div>
                <span className="text-xs text-gray-500">{isSpeaker ? '擴音' : '聽筒'}</span>
              </button>
              <button onClick={endCall} className="flex flex-col items-center gap-1">
                <div className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center shadow-lg">
                  <span className="text-2xl">📵</span>
                </div>
                <span className="text-xs text-gray-500">掛斷</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
