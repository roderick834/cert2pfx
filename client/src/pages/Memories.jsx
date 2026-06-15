import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api';

const TYPE_LABELS = { photo: '📷 照片', video: '🎬 影片', text: '📝 文字' };

export default function Memories() {
  const { user, couple } = useAuth();
  const [memories, setMemories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [type, setType] = useState('text');
  const [content, setContent] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [lightbox, setLightbox] = useState(null);
  const fileRef = useRef();

  useEffect(() => {
    if (!couple) return;
    api.get('/memories')
      .then((r) => setMemories(r.data.memories))
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
      if (file) fd.append('file', file);
      const r = await api.post('/memories', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setMemories([r.data.memory, ...memories]);
      setShowForm(false); setContent(''); setFile(null); setType('text');
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
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-rose-500 text-white text-sm font-semibold px-4 py-1.5 rounded-full"
        >
          {showForm ? '✕ 取消' : '+ 新增'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl shadow-sm p-4 mb-4 animate-fade-in">
          <form onSubmit={handleSubmit} className="space-y-3">
            {error && <div className="bg-red-50 text-red-600 rounded-xl px-3 py-2 text-sm">{error}</div>}
            <div className="flex gap-2">
              {['text', 'photo', 'video'].map((t) => (
                <button key={t} type="button" onClick={() => { setType(t); setFile(null); }}
                  className={`flex-1 py-1.5 rounded-xl text-sm font-medium transition-all ${type === t ? 'bg-rose-500 text-white' : 'bg-rose-50 text-rose-400'}`}>
                  {TYPE_LABELS[t]}
                </button>
              ))}
            </div>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
              className="w-full border border-rose-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300" />
            {type === 'text' ? (
              <textarea required value={content} onChange={(e) => setContent(e.target.value)}
                rows={3} placeholder="寫下這個回憶..."
                className="w-full border border-rose-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 resize-none" />
            ) : (
              <>
                <textarea value={content} onChange={(e) => setContent(e.target.value)}
                  rows={2} placeholder="附上說明（選填）"
                  className="w-full border border-rose-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 resize-none" />
                <div onClick={() => fileRef.current.click()}
                  className="border-2 border-dashed border-rose-200 rounded-xl p-5 text-center cursor-pointer hover:bg-rose-50">
                  {file
                    ? <span className="text-rose-500 text-sm font-medium">{file.name}</span>
                    : <span className="text-gray-400 text-sm">點擊選擇{type === 'photo' ? '圖片' : '影片'}</span>}
                </div>
                <input ref={fileRef} type="file" accept={type === 'photo' ? 'image/*' : 'video/*'}
                  className="hidden" onChange={(e) => setFile(e.target.files[0])} />
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
        <div className="space-y-4 pb-4">
          {memories.map((m) => {
            const isMe = m.user_id === user?.id;
            const dateStr = new Date(m.date || m.created_at).toLocaleDateString('zh-TW', {
              year: 'numeric', month: 'long', day: 'numeric',
            });
            return (
              <div key={m.id} className="bg-white rounded-2xl shadow-sm overflow-hidden animate-fade-in">
                {m.type === 'photo' && m.file_path && (
                  <img src={m.file_path} alt="memory"
                    className="w-full object-cover max-h-72 cursor-pointer active:opacity-80"
                    onClick={() => setLightbox(m.file_path)} />
                )}
                {m.type === 'video' && m.file_path && (
                  <video src={m.file_path} controls className="w-full max-h-72 bg-black" playsInline />
                )}
                <div className="p-4">
                  {m.content && (
                    <p className="text-gray-700 text-sm leading-relaxed mb-2 whitespace-pre-wrap">{m.content}</p>
                  )}
                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <span>{isMe ? '你' : m.username} · {TYPE_LABELS[m.type]}</span>
                    <span>{dateStr}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Photo lightbox */}
      {lightbox && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={() => setLightbox(null)}>
          <img src={lightbox} alt=""
            className="max-w-full max-h-full object-contain"
            style={{ touchAction: 'pinch-zoom' }} />
          <button onClick={() => setLightbox(null)}
            className="absolute top-10 right-4 w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-white text-xl">
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
