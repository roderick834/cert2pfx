import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePartnerOnline } from '../context/SocketContext';
import api from '../api';

function daysUntil(dateStr, repeatYearly) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const parts = dateStr.split('-').map(Number);
  let target = new Date(parts[0], parts[1] - 1, parts[2]);
  if (repeatYearly) {
    target = new Date(today.getFullYear(), parts[1] - 1, parts[2]);
    if (target < today) target = new Date(today.getFullYear() + 1, parts[1] - 1, parts[2]);
  }
  return Math.round((target - today) / 86400000);
}

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

function loadBg() {
  try {
    const s = localStorage.getItem('together-home-bg');
    return s ? JSON.parse(s) : PRESETS[0];
  } catch { return PRESETS[0]; }
}

// Full-screen image crop tool — drag to pan, pinch or slider to zoom
function CropTool({ file, onSave, onCancel }) {
  const imgRef = useRef(null);
  const containerRef = useRef(null);
  const [imgSrc] = useState(() => URL.createObjectURL(file));
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  const [scale, setScale] = useState(1);
  const gesture = useRef({ type: null, startTx: 0, startTy: 0, startX: 0, startY: 0, startDist: 0, startScale: 1 });

  const initCentered = () => {
    const img = imgRef.current;
    const cont = containerRef.current;
    if (!img || !cont) return;
    const s = Math.max(cont.clientWidth / img.naturalWidth, cont.clientHeight / img.naturalHeight);
    setScale(s);
    setTx((cont.clientWidth  - img.naturalWidth  * s) / 2);
    setTy((cont.clientHeight - img.naturalHeight * s) / 2);
  };

  const dist = (touches) => {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const onTouchStart = (e) => {
    e.preventDefault();
    if (e.touches.length === 1) {
      gesture.current = { type: 'pan', startTx: tx, startTy: ty, startX: e.touches[0].clientX, startY: e.touches[0].clientY, startDist: 0, startScale: scale };
    } else if (e.touches.length >= 2) {
      gesture.current = { type: 'pinch', startTx: tx, startTy: ty, startX: 0, startY: 0, startDist: dist(e.touches), startScale: scale };
    }
  };

  const onTouchMove = (e) => {
    e.preventDefault();
    const g = gesture.current;
    if (g.type === 'pan' && e.touches.length === 1) {
      setTx(g.startTx + e.touches[0].clientX - g.startX);
      setTy(g.startTy + e.touches[0].clientY - g.startY);
    } else if (g.type === 'pinch' && e.touches.length >= 2) {
      setScale(Math.max(0.1, g.startScale * dist(e.touches) / g.startDist));
    }
  };

  const onTouchEnd = (e) => { e.preventDefault(); gesture.current.type = null; };

  const handleSave = () => {
    const img = imgRef.current;
    const cont = containerRef.current;
    if (!img || !cont) return;
    const cW = cont.clientWidth, cH = cont.clientHeight;
    const canvas = document.createElement('canvas');
    canvas.width = cW * 2; canvas.height = cH * 2; // 2× for retina
    const ctx = canvas.getContext('2d');
    const r = 2; // container→canvas ratio
    ctx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight,
      tx * r, ty * r, img.naturalWidth * scale * r, img.naturalHeight * scale * r);
    onSave({ id: 'photo', dataUrl: canvas.toDataURL('image/jpeg', 0.88) });
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black flex flex-col">
      <div className="flex-shrink-0 flex items-center justify-between px-5 py-4 bg-black">
        <button onClick={onCancel} className="text-white/60 text-sm">取消</button>
        <span className="text-white font-semibold text-sm">選取背景範圍</span>
        <button onClick={handleSave} className="text-rose-400 font-bold text-sm">完成</button>
      </div>

      {/* Crop viewport */}
      <div
        ref={containerRef}
        className="relative overflow-hidden bg-black flex-1 touch-none"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <img
          ref={imgRef} src={imgSrc} alt="" onLoad={initCentered} draggable={false}
          style={{
            position: 'absolute', left: 0, top: 0, maxWidth: 'none',
            transform: `translate(${tx}px,${ty}px) scale(${scale})`, transformOrigin: '0 0',
            pointerEvents: 'none', userSelect: 'none',
          }}
        />
        {/* Rule-of-thirds grid overlay */}
        <div className="absolute inset-0 pointer-events-none border-2 border-white/30"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.12) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.12) 1px,transparent 1px)',
            backgroundSize: '33.33% 33.33%',
          }}
        />
      </div>

      {/* Zoom slider */}
      <div className="flex-shrink-0 flex flex-col items-center gap-2 px-6 py-5 bg-black">
        <div className="w-full flex items-center gap-3">
          <span className="text-white/50 text-lg">−</span>
          <input type="range" min={0.1} max={5} step={0.01} value={scale}
            onChange={e => setScale(Number(e.target.value))} className="flex-1 accent-rose-400" />
          <span className="text-white/50 text-lg">+</span>
        </div>
        <p className="text-white/40 text-xs">拖動調整位置 · 捏合或滑桿縮放</p>
      </div>
    </div>
  );
}

export default function Home() {
  const { couple } = useAuth();
  const navigate = useNavigate();
  const partnerOnline = usePartnerOnline();
  const [bg, setBg] = useState(loadBg);
  const [showBgPicker, setShowBgPicker] = useState(false);
  const [cropFile, setCropFile] = useState(null);
  const bgUploadRef = useRef();

  const [partnerNote, setPartnerNote] = useState(null);
  const [myNote, setMyNote] = useState(null);
  const [editingNote, setEditingNote] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [nextDate, setNextDate] = useState(null);

  useEffect(() => {
    if (!couple) return;
    api.get('/notes').then(r => {
      setPartnerNote(r.data.partner);
      setMyNote(r.data.mine);
    }).catch(() => {});

    api.get('/dates').then(r => {
      const coupleDate = couple?.couple?.couple_date;
      const extra = r.data.dates || [];
      const all = [
        ...(coupleDate ? [{ id: '__ann__', title: '在一起的紀念日 💕', date: coupleDate.split('T')[0], repeat_yearly: 1, emoji: '💑' }] : []),
        ...extra,
      ];
      const upcoming = all
        .map(d => ({ ...d, days: daysUntil(d.date, d.repeat_yearly) }))
        .filter(d => d.days >= 0)
        .sort((a, b) => a.days - b.days)[0] || null;
      setNextDate(upcoming);
    }).catch(() => {});
  }, [couple]);

  const saveNote = async () => {
    if (!noteText.trim()) return;
    setSavingNote(true);
    try {
      const r = await api.post('/notes', { content: noteText });
      setMyNote(r.data.note);
      setEditingNote(false);
    } catch {}
    finally { setSavingNote(false); }
  };

  const saveBg = (b) => {
    setBg(b);
    localStorage.setItem('together-home-bg', JSON.stringify(b));
    setShowBgPicker(false);
  };

  const handleBgUpload = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setShowBgPicker(false);
    setCropFile(f);
    e.target.value = '';
  };

  const bgStyle = bg.id === 'photo' && bg.dataUrl
    ? { backgroundImage: `url(${bg.dataUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : { background: bg.gradient };

  const isNight = bg.id === 'night';

  const startDate = couple?.couple?.couple_date || couple?.couple?.created_at;
  const formattedStart = startDate
    ? new Date(startDate).toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric' })
    : null;

  return (
    // -mb-20 cancels the pb-20 on <main> so the hero extends to screen bottom
    <div className="-mb-20">
      {/* Full-screen hero */}
      <div
        className="relative flex flex-col items-center justify-center overflow-hidden"
        style={{
          minHeight: 'calc(100svh - 3rem)',
          paddingBottom: '6rem',
          ...bgStyle,
        }}
      >
        {/* Dark overlay for photo backgrounds */}
        {bg.id === 'photo' && <div className="absolute inset-0 bg-black/30" />}

        {/* Sparkles */}
        {SPARKLES.map((s, i) => (
          <span key={i} className="sparkle-star"
            style={{ left: `${s.x}%`, top: `${s.y}%`, fontSize: s.s, animationDelay: `${s.d}s` }}>
            ✦
          </span>
        ))}

        {/* Customize bg button */}
        <button
          onClick={() => setShowBgPicker(true)}
          className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-white/25 backdrop-blur-sm flex items-center justify-center text-white text-base shadow"
        >
          🎨
        </button>

        {/* Main content */}
        <div className="relative z-10 flex flex-col items-center gap-3 px-6 w-full">
          {/* Avatars */}
          <div className="flex items-center gap-8">
            <div className="flex flex-col items-center gap-1.5">
              <div className="w-16 h-16 rounded-full bg-white/80 shadow-lg overflow-hidden flex items-center justify-center text-2xl font-bold text-rose-500">
                {couple?.me?.avatar
                  ? <img src={couple.me.avatar} alt="" className="w-full h-full object-cover" />
                  : couple?.me?.username?.[0]?.toUpperCase() || '?'}
              </div>
              <span className="text-xs font-semibold text-white drop-shadow-md">{couple?.me?.username}</span>
            </div>

            <div className="flex flex-col items-center gap-1">
              <span className="text-3xl drop-shadow">❤️</span>
            </div>

            <div className="flex flex-col items-center gap-1.5">
              <div className="relative">
                <div className="w-16 h-16 rounded-full bg-white/80 shadow-lg overflow-hidden flex items-center justify-center text-2xl font-bold text-rose-500">
                  {couple?.partner?.avatar
                    ? <img src={couple.partner.avatar} alt="" className="w-full h-full object-cover" />
                    : couple?.partner?.username?.[0]?.toUpperCase() || '?'}
                </div>
                <span className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white ${partnerOnline ? 'bg-green-400' : 'bg-gray-300'}`} />
              </div>
              <span className="text-xs font-semibold text-white drop-shadow-md">
                {couple?.partner?.username || '等待另一半'}
              </span>
            </div>
          </div>

          {/* Start date */}
          {formattedStart && (
            <p className="text-white/75 text-xs drop-shadow">相愛的第一天 · {formattedStart}</p>
          )}

          {/* Big days counter */}
          <div className="text-center leading-none">
            <p className="text-white/75 text-sm font-medium drop-shadow">過了</p>
            <p
              className="font-extrabold text-white drop-shadow-lg"
              style={{ fontSize: 'clamp(3rem, 18vw, 6rem)', lineHeight: 1 }}
            >
              {couple?.daysTogether ?? 0}
            </p>
            <p className="text-white/75 text-sm font-medium drop-shadow -mt-1">天</p>
          </div>

          {/* Quick action row */}
          <div className="flex gap-6 mt-2">
            {[
              { icon: '📷', label: '回憶', to: '/memories' },
              { icon: '💬', label: '聊天', to: '/chat' },
              { icon: '📞', label: '通話', to: '/call' },
              { icon: '🎨', label: '貼圖', to: '/stickers' },
            ].map(({ icon, label, to }) => (
              <button key={to} onClick={() => navigate(to)}
                className="flex flex-col items-center gap-1.5">
                <div className="w-12 h-12 rounded-full bg-white/25 backdrop-blur-sm flex items-center justify-center text-2xl shadow">
                  {icon}
                </div>
                <span className="text-xs text-white/80 font-medium drop-shadow">{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Scroll hint */}
        <div className="absolute bottom-20 left-0 right-0 flex justify-center pointer-events-none">
          <div className="flex flex-col items-center gap-0.5 animate-bounce opacity-60">
            <span className="text-white text-xs">更多</span>
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>

      {/* Below-hero content */}
      <div className="px-4 pt-5 pb-28 space-y-4">

        {/* Upcoming date countdown */}
        {nextDate && (
          <button onClick={() => navigate('/dates')}
            className="w-full bg-white rounded-3xl shadow-sm px-5 py-4 flex items-center gap-4 text-left active:scale-[0.98] transition-transform">
            <div className="w-14 h-14 bg-rose-50 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0">
              {nextDate.emoji}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-400 mb-1">即將到來</p>
              <p className="font-semibold text-gray-700 truncate">{nextDate.title}</p>
            </div>
            <div className="flex flex-col items-end flex-shrink-0">
              {nextDate.days === 0 ? (
                <span className="text-rose-500 font-bold">今天！🎉</span>
              ) : (
                <>
                  <span className="text-rose-500 font-bold text-2xl leading-none">{nextDate.days}</span>
                  <span className="text-gray-400 text-xs mt-0.5">天後</span>
                </>
              )}
            </div>
          </button>
        )}

        {/* Love notes section */}
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3 px-1">💌 愛的便利貼</p>

          {/* Partner note */}
          <div className="bg-white rounded-3xl shadow-sm p-5 mb-3 min-h-[80px]">
            {partnerNote ? (
              <>
                <p className="text-xs text-rose-400 font-medium mb-2">{partnerNote.username} 說</p>
                <p className="text-gray-700 text-base leading-relaxed whitespace-pre-wrap">{partnerNote.content}</p>
              </>
            ) : (
              <div className="flex items-center justify-center h-full min-h-[48px]">
                <p className="text-gray-400 text-sm">對方還沒有留下便利貼 ...</p>
              </div>
            )}
          </div>

          {/* My note */}
          {editingNote ? (
            <div className="bg-rose-50 rounded-3xl p-5">
              <p className="text-xs text-rose-400 font-medium mb-3">你說</p>
              <textarea
                autoFocus
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
                placeholder="說點什麼給對方..."
                rows={4}
                className="w-full text-base text-gray-700 resize-none focus:outline-none leading-relaxed bg-transparent"
              />
              <div className="flex gap-3 mt-4">
                <button onClick={() => setEditingNote(false)}
                  className="flex-1 py-3 rounded-2xl text-gray-500 bg-white font-medium">取消</button>
                <button onClick={saveNote} disabled={savingNote || !noteText.trim()}
                  className="flex-1 py-3 rounded-2xl font-semibold bg-rose-500 text-white disabled:opacity-50">
                  {savingNote ? '儲存中...' : '送出 ❤️'}
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => { setNoteText(myNote?.content || ''); setEditingNote(true); }}
              className="w-full bg-rose-50 rounded-3xl p-5 text-left active:scale-[0.98] transition-transform min-h-[80px] flex flex-col justify-center">
              {myNote ? (
                <>
                  <p className="text-xs text-rose-400 font-medium mb-2">你說（點擊修改）</p>
                  <p className="text-gray-600 text-base leading-relaxed whitespace-pre-wrap">{myNote.content}</p>
                </>
              ) : (
                <div className="flex items-center justify-center gap-2 py-2">
                  <span className="text-2xl">✏️</span>
                  <span className="text-rose-400 font-medium">留下便利貼給對方</span>
                </div>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Image crop tool */}
      {cropFile && (
        <CropTool
          file={cropFile}
          onSave={(bgData) => { saveBg(bgData); setCropFile(null); }}
          onCancel={() => setCropFile(null)}
        />
      )}

      {/* Background picker bottom sheet */}
      {showBgPicker && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowBgPicker(false)} />
          <div className="relative bg-white rounded-t-3xl px-6 py-8">
            <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-5" />
            <h3 className="text-center font-semibold text-gray-700 mb-5">選擇背景</h3>
            <div className="flex justify-center gap-3 mb-5">
              {PRESETS.map((p) => (
                <button key={p.id} onClick={() => saveBg(p)}
                  className={`w-12 h-12 rounded-full border-4 transition-all ${bg.id === p.id ? 'border-rose-500 scale-110' : 'border-transparent'}`}
                  style={{ background: p.gradient }} />
              ))}
            </div>
            <div onClick={() => bgUploadRef.current.click()}
              className="border-2 border-dashed border-rose-200 rounded-2xl p-5 text-center cursor-pointer hover:bg-rose-50 transition-all">
              <span className="text-sm text-gray-400">📷 上傳自訂背景圖片</span>
            </div>
            <input ref={bgUploadRef} type="file" accept="image/*" className="hidden" onChange={handleBgUpload} />
          </div>
        </div>
      )}
    </div>
  );
}
