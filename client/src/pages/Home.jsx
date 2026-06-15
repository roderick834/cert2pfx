import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';

const PRESETS = [
  { id: 'rose',   gradient: 'linear-gradient(160deg,#fda4af 0%,#fbcfe8 60%,#fff1f2 100%)' },
  { id: 'purple', gradient: 'linear-gradient(160deg,#c4b5fd 0%,#e9d5ff 60%,#fdf4ff 100%)' },
  { id: 'mint',   gradient: 'linear-gradient(160deg,#6ee7b7 0%,#d1fae5 60%,#ecfdf5 100%)' },
  { id: 'peach',  gradient: 'linear-gradient(160deg,#fdba74 0%,#fde68a 60%,#fffbeb 100%)' },
  { id: 'sky',    gradient: 'linear-gradient(160deg,#93c5fd 0%,#bfdbfe 60%,#eff6ff 100%)' },
  { id: 'night',  gradient: 'linear-gradient(160deg,#1e1b4b 0%,#4c1d95 60%,#312e81 100%)' },
];

const SPARKLES = [
  { x: 7,  y: 8,  s: 14, d: 0    },
  { x: 85, y: 5,  s: 10, d: 0.6  },
  { x: 55, y: 18, s: 8,  d: 1.2  },
  { x: 18, y: 35, s: 12, d: 0.3  },
  { x: 92, y: 28, s: 7,  d: 1.8  },
  { x: 72, y: 50, s: 10, d: 0.9  },
  { x: 12, y: 62, s: 8,  d: 1.5  },
  { x: 40, y: 75, s: 6,  d: 0.4  },
  { x: 90, y: 68, s: 12, d: 2.1  },
  { x: 30, y: 88, s: 8,  d: 1.1  },
  { x: 62, y: 90, s: 10, d: 0.7  },
  { x: 5,  y: 93, s: 6,  d: 1.9  },
];

const TYPE_LABELS = { photo: '📷 照片', video: '🎬 影片', text: '📝 文字' };

function loadBg() {
  try {
    const s = localStorage.getItem('together-home-bg');
    return s ? JSON.parse(s) : PRESETS[0];
  } catch { return PRESETS[0]; }
}

function Avatar({ src, initial, size = 16 }) {
  if (src) return <img src={src} alt="" className={`w-${size} h-${size} rounded-full object-cover`} />;
  return (
    <div className={`w-${size} h-${size} rounded-full bg-white/80 flex items-center justify-center font-bold text-rose-500`}
      style={{ fontSize: size * 2 }}>
      {initial || '?'}
    </div>
  );
}

export default function Home() {
  const { user, couple } = useAuth();
  const navigate = useNavigate();
  const [bg, setBg] = useState(loadBg);
  const [showBgPicker, setShowBgPicker] = useState(false);
  const bgUploadRef = useRef();

  const [memories, setMemories] = useState([]);
  const [memLoading, setMemLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [type, setType] = useState('text');
  const [content, setContent] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const fileRef = useRef();

  // Lightbox
  const [lightbox, setLightbox] = useState(null); // { url, type }

  useEffect(() => {
    if (!couple) return;
    api.get('/memories')
      .then((r) => setMemories(r.data.memories))
      .catch(() => {})
      .finally(() => setMemLoading(false));
  }, [couple]);

  const saveBg = (b) => {
    setBg(b);
    localStorage.setItem('together-home-bg', JSON.stringify(b));
    setShowBgPicker(false);
  };

  const handleBgUpload = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = (ev) => saveBg({ id: 'photo', dataUrl: ev.target.result });
    reader.readAsDataURL(f);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(''); setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('type', type); fd.append('date', date);
      if (content) fd.append('content', content);
      if (file) fd.append('file', file);
      const r = await api.post('/memories', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setMemories([r.data.memory, ...memories]);
      setShowForm(false); setContent(''); setFile(null); setType('text');
    } catch (err) { setFormError(err.response?.data?.error || '上傳失敗'); }
    finally { setSubmitting(false); }
  };

  if (!couple) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center px-8">
        <div className="text-5xl mb-4">💔</div>
        <p className="text-gray-500">請先在「我們」頁面連結另一半</p>
      </div>
    );
  }

  const bgStyle = bg.id === 'photo' && bg.dataUrl
    ? { backgroundImage: `url(${bg.dataUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : { background: bg.gradient };

  const isNight = bg.id === 'night';
  const textColor = isNight ? 'text-white' : 'text-white';
  const subColor = isNight ? 'text-white/70' : 'text-white/80';

  const startDate = couple.couple?.couple_date || couple.couple?.created_at;
  const formattedStart = startDate
    ? new Date(startDate).toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric' })
    : null;

  return (
    <div className="flex flex-col">
      {/* ── Hero section ── */}
      <div className="relative overflow-hidden" style={{ ...bgStyle, minHeight: '58vw', maxHeight: 380 }}>
        {/* Background overlay for photo */}
        {bg.id === 'photo' && <div className="absolute inset-0 bg-black/25" />}

        {/* Sparkles */}
        {SPARKLES.map((s, i) => (
          <span
            key={i}
            className="sparkle-star"
            style={{ left: `${s.x}%`, top: `${s.y}%`, fontSize: s.s, animationDelay: `${s.d}s` }}
          >✦</span>
        ))}

        {/* Customize bg button */}
        <button
          onClick={() => setShowBgPicker(true)}
          className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-white/30 backdrop-blur-sm flex items-center justify-center text-white text-sm"
        >
          🎨
        </button>

        {/* Couple display */}
        <div className="relative z-10 flex flex-col items-center justify-center h-full px-4 py-6 gap-2">
          {/* Avatars row */}
          <div className="flex items-center gap-6">
            <div className="flex flex-col items-center gap-1">
              <div className="w-14 h-14 rounded-full bg-white/80 shadow-lg overflow-hidden flex items-center justify-center text-2xl font-bold text-rose-500">
                {couple.me?.avatar
                  ? <img src={couple.me.avatar} alt="" className="w-full h-full object-cover" />
                  : couple.me?.username?.[0]?.toUpperCase()}
              </div>
              <span className={`text-xs font-semibold drop-shadow ${textColor}`}>{couple.me?.username}</span>
            </div>
            <div className="text-2xl drop-shadow" style={{ animation: 'pulse 2s infinite' }}>❤️</div>
            <div className="flex flex-col items-center gap-1">
              <div className="w-14 h-14 rounded-full bg-white/80 shadow-lg overflow-hidden flex items-center justify-center text-2xl font-bold text-rose-500">
                {couple.partner?.avatar
                  ? <img src={couple.partner.avatar} alt="" className="w-full h-full object-cover" />
                  : couple.partner?.username?.[0]?.toUpperCase() || '?'}
              </div>
              <span className={`text-xs font-semibold drop-shadow ${textColor}`}>{couple.partner?.username || '等待另一半'}</span>
            </div>
          </div>

          {/* Start date */}
          {formattedStart && (
            <p className={`text-xs drop-shadow ${subColor}`}>相愛的第一天 · {formattedStart}</p>
          )}

          {/* Big counter */}
          <div className="text-center leading-none">
            <p className={`text-xs font-medium drop-shadow ${subColor}`}>過了</p>
            <p className={`font-extrabold drop-shadow ${textColor}`} style={{ fontSize: 'clamp(2.5rem,13vw,5rem)' }}>
              {couple.daysTogether}
            </p>
            <p className={`text-sm font-medium drop-shadow -mt-1 ${subColor}`}>天</p>
          </div>

          {/* Quick actions */}
          <div className="flex gap-5 mt-1">
            {[
              { icon: '📷', label: '回憶', action: () => document.getElementById('memories-section')?.scrollIntoView({ behavior: 'smooth' }) },
              { icon: '💬', label: '聊天', action: () => navigate('/chat') },
              { icon: '📞', label: '通話', action: () => navigate('/call') },
              { icon: '🎨', label: '貼圖', action: () => navigate('/stickers') },
            ].map(({ icon, label, action }) => (
              <button key={label} onClick={action} className="flex flex-col items-center gap-1">
                <div className="w-11 h-11 rounded-full bg-white/25 backdrop-blur-sm flex items-center justify-center text-xl shadow">
                  {icon}
                </div>
                <span className={`text-xs drop-shadow ${subColor}`}>{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Memories section ── */}
      <div id="memories-section" className="px-4 py-4">
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
              {formError && <div className="bg-red-50 text-red-600 rounded-xl px-3 py-2 text-sm">{formError}</div>}
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
                    {file ? <span className="text-rose-500 text-sm font-medium">{file.name}</span>
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

        {memLoading ? (
          <div className="text-center py-12 text-gray-400">載入中...</div>
        ) : memories.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-5xl mb-3">📸</div>
            <p className="text-gray-400 text-sm">還沒有回憶，快去新增第一個吧！</p>
          </div>
        ) : (
          <div className="space-y-4">
            {memories.map((m) => {
              const isMe = m.user_id === user?.id;
              const dateStr = new Date(m.date || m.created_at).toLocaleDateString('zh-TW', {
                year: 'numeric', month: 'long', day: 'numeric',
              });
              return (
                <div key={m.id} className="bg-white rounded-2xl shadow-sm overflow-hidden animate-fade-in">
                  {m.type === 'photo' && m.file_path && (
                    <img
                      src={m.file_path} alt="memory"
                      className="w-full object-cover max-h-72 cursor-pointer active:opacity-80"
                      onClick={() => setLightbox({ url: m.file_path, type: 'photo' })}
                    />
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
      </div>

      {/* ── Photo lightbox ── */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={() => setLightbox(null)}
        >
          <img
            src={lightbox.url}
            alt=""
            className="max-w-full max-h-full object-contain"
            style={{ touchAction: 'pinch-zoom' }}
          />
          <button
            onClick={() => setLightbox(null)}
            className="absolute top-10 right-4 w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-white text-xl"
          >
            ✕
          </button>
        </div>
      )}

      {/* ── Background picker ── */}
      {showBgPicker && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowBgPicker(false)} />
          <div className="relative bg-white rounded-t-3xl px-6 py-8">
            <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-5" />
            <h3 className="text-center font-semibold text-gray-700 mb-4">選擇背景</h3>
            <div className="flex justify-center gap-3 mb-4">
              {PRESETS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => saveBg(p)}
                  className={`w-12 h-12 rounded-full border-4 transition-all ${bg.id === p.id ? 'border-rose-500 scale-110' : 'border-transparent'}`}
                  style={{ background: p.gradient }}
                />
              ))}
            </div>
            <div
              onClick={() => bgUploadRef.current.click()}
              className="border-2 border-dashed border-rose-200 rounded-2xl p-4 text-center cursor-pointer hover:bg-rose-50 transition-all"
            >
              <span className="text-sm text-gray-400">📷 上傳自訂背景圖片</span>
            </div>
            <input ref={bgUploadRef} type="file" accept="image/*" className="hidden" onChange={handleBgUpload} />
          </div>
        </div>
      )}
    </div>
  );
}
