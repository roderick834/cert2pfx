import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api';

const TYPE_LABELS = { photo: '照片', video: '影片', text: '文字' };
const TYPE_ICONS  = { photo: '📷', video: '🎬', text: '📝' };

// Swipeable photo viewer inside detail modal
function PhotoViewer({ files }) {
  const [idx, setIdx] = useState(0);
  const touchX = useRef(null);

  const prev = () => setIdx(i => Math.max(0, i - 1));
  const next = () => setIdx(i => Math.min(files.length - 1, i + 1));

  const onTouchStart = (e) => { touchX.current = e.touches[0].clientX; };
  const onTouchEnd = (e) => {
    if (touchX.current === null) return;
    const diff = touchX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) diff > 0 ? next() : prev();
    touchX.current = null;
  };

  if (files.length === 0) return null;

  return (
    <div className="relative bg-black select-none" style={{ maxHeight: '55vw', maxWidth: '100%', overflow: 'hidden' }}
      onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <img
        src={files[idx]}
        alt=""
        className="w-full object-contain"
        style={{ maxHeight: '55vw', display: 'block', margin: '0 auto' }}
      />
      {files.length > 1 && (
        <>
          <button onClick={prev} disabled={idx === 0}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 text-white flex items-center justify-center disabled:opacity-30">
            ‹
          </button>
          <button onClick={next} disabled={idx === files.length - 1}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 text-white flex items-center justify-center disabled:opacity-30">
            ›
          </button>
          <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5">
            {files.map((_, i) => (
              <button key={i} onClick={() => setIdx(i)}
                className={`w-1.5 h-1.5 rounded-full transition-all ${i === idx ? 'bg-white' : 'bg-white/40'}`} />
            ))}
          </div>
          <div className="absolute top-2 right-3 bg-black/50 rounded-full px-2 py-0.5 text-white text-xs">
            {idx + 1}/{files.length}
          </div>
        </>
      )}
    </div>
  );
}

// Detail modal for a single memory
function MemoryDetail({ memory, onClose }) {
  const isPhoto = memory.type === 'photo';
  const isVideo = memory.type === 'video';
  const dateStr = new Date(memory.date || memory.created_at).toLocaleDateString('zh-TW', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col" onClick={onClose}>
      <div className="flex-shrink-0 bg-black/80 px-4 py-3 flex items-center justify-between" onClick={e => e.stopPropagation()}>
        <span className="text-white/80 text-sm">{TYPE_ICONS[memory.type]} {dateStr}</span>
        <button onClick={onClose} className="w-8 h-8 flex items-center justify-center text-white text-xl">✕</button>
      </div>

      <div className="flex-1 overflow-y-auto bg-black" onClick={e => e.stopPropagation()}>
        {isPhoto && memory.files.length > 0 && <PhotoViewer files={memory.files} />}
        {isVideo && memory.files.length > 0 && (
          <video src={memory.files[0]} controls className="w-full bg-black" playsInline />
        )}
        {memory.content && (
          <div className="px-4 py-4">
            <p className="text-white text-sm leading-relaxed whitespace-pre-wrap">{memory.content}</p>
          </div>
        )}
        {!memory.content && !isPhoto && !isVideo && (
          <div className="px-4 py-8 text-center text-white/50 text-sm">無內容</div>
        )}
      </div>
    </div>
  );
}

export default function Memories() {
  const { user, couple } = useAuth();
  const [memories, setMemories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [type, setType] = useState('text');
  const [content, setContent] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [files, setFiles] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null); // memory for detail view
  const fileRef = useRef();

  useEffect(() => {
    if (!couple) return;
    api.get('/memories')
      .then(r => setMemories(r.data.memories))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [couple]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('type', type); fd.append('date', date);
      if (content) fd.append('content', content);
      files.forEach(f => fd.append('files', f));
      const r = await api.post('/memories', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setMemories([r.data.memory, ...memories]);
      setShowForm(false); setContent(''); setFiles([]); setType('text');
    } catch (err) {
      setError(err.response?.data?.error || '上傳失敗');
    } finally { setSubmitting(false); }
  };

  if (!couple) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center px-8">
        <div className="text-5xl mb-4">💔</div>
        <p className="text-gray-500">請先連結另一半</p>
      </div>
    );
  }

  return (
    <div className="px-4 py-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-bold text-rose-700">我們的回憶</h2>
        <button onClick={() => setShowForm(!showForm)}
          className="bg-rose-500 text-white text-sm font-semibold px-4 py-1.5 rounded-full">
          {showForm ? '✕ 取消' : '+ 新增'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl shadow-sm p-4 mb-4 animate-fade-in">
          <form onSubmit={handleSubmit} className="space-y-3">
            {error && <div className="bg-red-50 text-red-600 rounded-xl px-3 py-2 text-sm">{error}</div>}
            <div className="flex gap-2">
              {['text', 'photo', 'video'].map(t => (
                <button key={t} type="button" onClick={() => { setType(t); setFiles([]); }}
                  className={`flex-1 py-1.5 rounded-xl text-sm font-medium ${type === t ? 'bg-rose-500 text-white' : 'bg-rose-50 text-rose-400'}`}>
                  {TYPE_ICONS[t]} {TYPE_LABELS[t]}
                </button>
              ))}
            </div>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="w-full border border-rose-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300" />
            {type === 'text' ? (
              <textarea required value={content} onChange={e => setContent(e.target.value)}
                rows={4} placeholder="寫下這個回憶..."
                className="w-full border border-rose-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 resize-none" />
            ) : (
              <>
                <textarea value={content} onChange={e => setContent(e.target.value)}
                  rows={2} placeholder="附上說明（選填）"
                  className="w-full border border-rose-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 resize-none" />
                <div onClick={() => fileRef.current.click()}
                  className="border-2 border-dashed border-rose-200 rounded-xl p-4 text-center cursor-pointer hover:bg-rose-50">
                  {files.length > 0
                    ? <span className="text-rose-500 text-sm font-medium">已選擇 {files.length} 個{type === 'photo' ? '圖片' : '影片'}</span>
                    : <span className="text-gray-400 text-sm">點擊選擇{type === 'photo' ? '圖片（可多選）' : '影片'}</span>}
                </div>
                <input ref={fileRef} type="file"
                  accept={type === 'photo' ? 'image/*' : 'video/*'}
                  multiple={type === 'photo'}
                  className="hidden"
                  onChange={e => setFiles(Array.from(e.target.files))} />
              </>
            )}
            <button type="submit" disabled={submitting}
              className="w-full bg-rose-500 text-white font-semibold py-2.5 rounded-xl disabled:opacity-60 text-sm">
              {submitting ? '上傳中...' : '儲存回憶 ❤️'}
            </button>
          </form>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-400">載入中...</div>
      ) : memories.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-3">📸</div>
          <p className="text-gray-400 text-sm">還沒有回憶，快去新增第一個吧！</p>
        </div>
      ) : (
        <div className="space-y-3 pb-4">
          {memories.map(m => {
            const isMe = m.user_id === user?.id;
            const dateStr = new Date(m.date || m.created_at).toLocaleDateString('zh-TW', {
              year: 'numeric', month: 'long', day: 'numeric',
            });
            const thumb = m.files?.[0];
            return (
              <div key={m.id}
                className="bg-white rounded-2xl shadow-sm overflow-hidden cursor-pointer active:scale-[0.98] transition-transform animate-fade-in"
                onClick={() => setSelected(m)}>
                {thumb && m.type === 'photo' && (
                  <img src={thumb} alt="" className="w-full object-cover" style={{ maxHeight: 180 }} />
                )}
                {m.type === 'video' && thumb && (
                  <div className="w-full bg-gray-100 flex items-center justify-center" style={{ height: 100 }}>
                    <span className="text-4xl">🎬</span>
                  </div>
                )}
                <div className="px-4 py-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold text-rose-400 bg-rose-50 px-2 py-0.5 rounded-full">
                      {TYPE_ICONS[m.type]} {TYPE_LABELS[m.type]}
                    </span>
                    {m.files?.length > 1 && (
                      <span className="text-xs text-gray-400">{m.files.length} 張</span>
                    )}
                    <span className="text-xs text-gray-400 ml-auto">{dateStr}</span>
                  </div>
                  {m.content && (
                    <p className="text-gray-600 text-sm leading-snug line-clamp-2">{m.content}</p>
                  )}
                  <p className="text-xs text-gray-300 mt-1">{isMe ? '你' : m.username}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selected && <MemoryDetail memory={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
