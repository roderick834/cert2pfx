import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

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

export default function Home() {
  const { couple } = useAuth();
  const navigate = useNavigate();
  const [bg, setBg] = useState(loadBg);
  const [showBgPicker, setShowBgPicker] = useState(false);
  const bgUploadRef = useRef();

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
          paddingBottom: '5.5rem', // keep content above nav bar
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
              <div className="w-16 h-16 rounded-full bg-white/80 shadow-lg overflow-hidden flex items-center justify-center text-2xl font-bold text-rose-500">
                {couple?.partner?.avatar
                  ? <img src={couple.partner.avatar} alt="" className="w-full h-full object-cover" />
                  : couple?.partner?.username?.[0]?.toUpperCase() || '?'}
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
      </div>

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
