import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket, usePartnerOnline } from '../context/SocketContext';
import api from '../api';

export default function Chat() {
  const { user, couple } = useAuth();
  const socket = useSocket();
  const partnerOnline = usePartnerOnline();
  const [messages, setMessages] = useState([]);
  const [stickers, setStickers] = useState([]);
  const [text, setText] = useState('');
  const [showStickers, setShowStickers] = useState(false);
  const [loading, setLoading] = useState(true);
  // partnerLastRead: ISO string of when partner last read my messages
  const [partnerLastRead, setPartnerLastRead] = useState(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (!couple) return;
    Promise.all([api.get('/messages'), api.get('/stickers')])
      .then(([msgRes, stickerRes]) => {
        const msgs = msgRes.data.messages;
        setMessages(msgs);
        setStickers(stickerRes.data.stickers);
        // Derive initial partnerLastRead from loaded messages
        const lastRead = msgs
          .filter((m) => m.sender_id === user?.id && m.read_at)
          .map((m) => m.read_at)
          .sort()
          .pop();
        if (lastRead) setPartnerLastRead(lastRead);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [couple]);

  useEffect(() => {
    if (!socket || !couple) return;
    socket.emit('join-couple-room', couple.couple.id);

    const handleNew = (msg) => {
      setMessages((prev) => [...prev, msg]);
      // Auto-mark incoming messages as read (user is actively in chat)
      socket.emit('mark-read');
    };
    const handleRead = ({ read_at }) => {
      setPartnerLastRead(read_at);
    };

    socket.on('new-message', handleNew);
    socket.on('messages-read', handleRead);
    return () => {
      socket.off('new-message', handleNew);
      socket.off('messages-read', handleRead);
    };
  }, [socket, couple]);

  // Mark messages as read when chat opens
  useEffect(() => {
    if (socket && couple) socket.emit('mark-read');
  }, [socket, couple]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendText = () => {
    if (!text.trim() || !socket) return;
    socket.emit('send-message', { content: text.trim() });
    setText('');
    setShowStickers(false);
  };

  const sendSticker = (sticker) => {
    if (!socket) return;
    socket.emit('send-message', { sticker_id: sticker.id, content: null });
    setShowStickers(false);
  };

  const formatTime = (ts) =>
    new Date(ts).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' });

  if (!couple) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center px-8">
        <div className="text-5xl mb-4">💔</div>
        <p className="text-gray-500">請先連結另一半才能聊天</p>
      </div>
    );
  }

  // Find the last message I sent that has been read (to show 已讀 under it)
  const myMessages = messages.filter((m) => m.sender_id === user?.id);
  let lastReadMsgId = null;
  if (partnerLastRead) {
    for (let i = myMessages.length - 1; i >= 0; i--) {
      const m = myMessages[i];
      if (new Date(m.created_at) <= new Date(partnerLastRead)) {
        lastReadMsgId = m.id;
        break;
      }
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Chat header */}
      <div className="px-4 py-3 bg-white border-b border-rose-100 flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-rose-200 flex items-center justify-center text-rose-600 font-bold text-sm">
          {couple.partner?.username?.[0]?.toUpperCase() || '?'}
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-700">{couple.partner?.username || '等待另一半加入...'}</p>
          <p className="text-xs text-gray-400">在一起 {couple.daysTogether} 天</p>
          <span className={`text-xs font-medium ${partnerOnline ? 'text-green-500' : 'text-gray-400'}`}>
            {partnerOnline ? '● 在線上' : '○ 離線'}
          </span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {loading ? (
          <div className="text-center text-gray-400 py-8">載入訊息中...</div>
        ) : messages.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-4xl mb-2">💌</div>
            <p className="text-gray-400 text-sm">傳送第一則訊息吧！</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender_id === user?.id;
            const sticker = msg.sticker_id ? stickers.find((s) => s.id === msg.sticker_id) : null;
            const showRead = isMe && msg.id === lastReadMsgId;
            return (
              <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[72%] ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                  {sticker ? (
                    <img src={sticker.image_data} alt={sticker.name}
                      className="w-24 h-24 object-contain rounded-2xl animate-bounce-in" />
                  ) : (
                    <div className={`rounded-2xl px-4 py-2.5 text-sm shadow-sm animate-fade-in ${
                      isMe ? 'bg-rose-500 text-white rounded-br-md' : 'bg-white text-gray-700 rounded-bl-md'
                    }`}>
                      {msg.content}
                    </div>
                  )}
                  <div className={`flex items-center gap-1 mt-1 px-1 ${isMe ? 'flex-row-reverse' : ''}`}>
                    <span className="text-xs text-gray-400">{formatTime(msg.created_at)}</span>
                    {showRead && (
                      <span className="text-xs text-rose-400 font-medium">已讀</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Sticker panel */}
      {showStickers && (
        <div className="bg-white border-t border-rose-100 p-3 grid grid-cols-4 gap-2 max-h-40 overflow-y-auto">
          {stickers.length === 0 ? (
            <p className="col-span-4 text-center text-gray-400 text-sm py-4">
              還沒有貼圖，去「貼圖」頁面建立吧！
            </p>
          ) : (
            stickers.map((s) => (
              <button key={s.id} onClick={() => sendSticker(s)}
                className="aspect-square rounded-xl overflow-hidden hover:scale-105 transition-transform">
                <img src={s.image_data} alt={s.name} className="w-full h-full object-contain" />
              </button>
            ))
          )}
        </div>
      )}

      {/* Input bar */}
      <div className="bg-white border-t border-rose-100 px-3 py-3 flex items-center gap-2">
        <button onClick={() => setShowStickers(!showStickers)}
          className={`text-xl p-2 rounded-full transition-all ${showStickers ? 'bg-rose-100 text-rose-500' : 'text-gray-400 hover:text-rose-400'}`}>
          😊
        </button>
        <input
          type="text" value={text} onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendText(); } }}
          placeholder="傳送訊息..."
          className="flex-1 border border-rose-200 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
        />
        <button onClick={sendText} disabled={!text.trim()}
          className="bg-rose-500 hover:bg-rose-600 disabled:opacity-40 text-white p-2.5 rounded-full transition-all">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
            <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
