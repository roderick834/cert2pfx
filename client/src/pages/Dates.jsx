import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';

const EMOJIS = ['❤️', '💍', '🎂', '🌸', '✈️', '🎉', '💑', '🏠', '🐾', '🎁', '🌙', '⭐', '🎊', '💐', '🥂', '🌅'];

const QUICK_PRESETS = [
  { label: '🎂 生日',   emoji: '🎂', titleTemplate: '的生日',   repeatYearly: true  },
  { label: '💍 紀念日', emoji: '💍', titleTemplate: '紀念日',   repeatYearly: true  },
  { label: '✈️ 旅行',  emoji: '✈️', titleTemplate: '旅行',     repeatYearly: false },
  { label: '🎉 活動',  emoji: '🎉', titleTemplate: '活動',     repeatYearly: false },
];

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

function DateCard({ d, onDelete, onBirthdayClick }) {
  const days = daysUntil(d.date, d.repeat_yearly);
  const isToday = days === 0;
  const isTomorrow = days === 1;
  const isIn2Days = days === 2;
  const isPast = days < 0 && !d.repeat_yearly;
  const isSoon = days > 0 && days <= 2;

  return (
    <div
      className={`relative bg-white rounded-2xl shadow-sm overflow-hidden transition-all active:scale-[0.98]
        ${isToday ? 'ring-2 ring-rose-400' : isSoon ? 'ring-1 ring-rose-200' : ''}
        ${onBirthdayClick ? 'cursor-pointer' : ''}`}
      onClick={onBirthdayClick || undefined}
    >
      <div className={`absolute left-0 top-0 bottom-0 w-1
        ${isToday ? 'bg-rose-400' : isSoon ? 'bg-rose-300' : isPast ? 'bg-gray-200' : 'bg-rose-200'}`} />
      <div className="pl-4 pr-3 py-3.5 flex items-center gap-3">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0
          ${isToday ? 'bg-rose-50' : isSoon ? 'bg-rose-50/60' : 'bg-gray-50'}`}>
          {d.emoji}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="font-semibold text-gray-800 text-sm truncate">{d.title}</p>
            {isSoon && !isToday && (
              <span className="flex-shrink-0 text-xs bg-rose-500 text-white px-1.5 py-0.5 rounded-full font-medium">
                {isTomorrow ? '明天' : '2天後'}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            {new Date(d.date + 'T00:00:00').toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric' })}
            {d.repeat_yearly ? ' · 每年' : ''}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          {isToday ? (
            <span className="text-rose-500 font-bold text-sm">今天！🎉</span>
          ) : isPast ? (
            <span className="text-gray-400 text-sm">已過 {Math.abs(days)} 天</span>
          ) : (
            <>
              <span className={`font-bold text-lg leading-none ${isSoon ? 'text-rose-500' : 'text-rose-400'}`}>{days}</span>
              <span className="text-gray-400 text-xs">天後</span>
            </>
          )}
          {d._readonly ? (
            <span className="text-[10px] text-gray-300 mt-1">🔒</span>
          ) : (
            <button onClick={() => onDelete(d.id)} className="text-gray-300 hover:text-red-400 transition-colors mt-1 text-xs">✕</button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Dates() {
  const { couple } = useAuth();
  const navigate = useNavigate();
  const [dates, setDates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [repeatYearly, setRepeatYearly] = useState(true);
  const [emoji, setEmoji] = useState('❤️');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!couple) return;
    api.get('/dates')
      .then(r => setDates(r.data.dates))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [couple]);

  const sorted = [...dates].sort((a, b) => {
    const da = daysUntil(a.date, a.repeat_yearly);
    const db_ = daysUntil(b.date, b.repeat_yearly);
    if (da >= 0 && db_ >= 0) return da - db_;
    if (da >= 0) return -1;
    if (db_ >= 0) return 1;
    return db_ - da;
  });

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!title || !date) return;
    setSubmitting(true);
    try {
      const r = await api.post('/dates', { title, date, repeat_yearly: repeatYearly, emoji });
      setDates(prev => [...prev, r.data.date]);
      setShowForm(false);
      setTitle(''); setDate(''); setEmoji('❤️'); setRepeatYearly(true);
    } catch {}
    finally { setSubmitting(false); }
  };

  const handleDelete = async (id) => {
    await api.delete(`/dates/${id}`).catch(() => {});
    setDates(prev => prev.filter(d => d.id !== id));
  };

  // Build list with couple anniversary auto-pinned
  const coupleDate = couple?.couple?.couple_date;
  const coupleAnniversary = coupleDate ? {
    id: '__anniversary__',
    title: '在一起的紀念日 💕',
    date: coupleDate.split('T')[0],
    repeat_yearly: 1,
    emoji: '💑',
    _pinned: true,
  } : null;

  const allDates = coupleAnniversary
    ? [coupleAnniversary, ...sorted.filter(d => d.date !== coupleDate?.split('T')[0])]
    : sorted;

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
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-bold text-rose-700">重要日子</h2>
        <button onClick={() => setShowForm(!showForm)}
          className="bg-rose-500 text-white text-sm font-semibold px-4 py-1.5 rounded-full">
          {showForm ? '✕ 取消' : '+ 新增'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="bg-white rounded-2xl shadow-sm p-4 mb-4 space-y-3 animate-fade-in">
          {/* Quick presets */}
          <div>
            <p className="text-xs text-gray-500 mb-2">快速選擇類型</p>
            <div className="flex gap-2 flex-wrap">
              {QUICK_PRESETS.map(p => (
                <button key={p.label} type="button"
                  onClick={() => { setEmoji(p.emoji); setTitle(p.titleTemplate); setRepeatYearly(p.repeatYearly); }}
                  className="px-3 py-1.5 rounded-full text-sm bg-rose-50 text-rose-500 font-medium hover:bg-rose-100 transition-colors">
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Emoji picker */}
          <div>
            <p className="text-xs text-gray-500 mb-2">選擇圖示</p>
            <div className="flex flex-wrap gap-2">
              {EMOJIS.map(em => (
                <button key={em} type="button" onClick={() => setEmoji(em)}
                  className={`w-9 h-9 rounded-xl text-xl flex items-center justify-center transition-all ${emoji === em ? 'bg-rose-100 ring-2 ring-rose-400 scale-110' : 'bg-gray-50'}`}>
                  {em}
                </button>
              ))}
            </div>
          </div>

          <input
            type="text" value={title} onChange={e => setTitle(e.target.value)}
            placeholder="日子名稱（例：媽媽的生日）" required
            className="w-full border border-rose-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
          />

          <input
            type="date" value={date} onChange={e => setDate(e.target.value)} required
            className="w-full border border-rose-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
          />

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <div
              onClick={() => setRepeatYearly(!repeatYearly)}
              className={`w-10 h-6 rounded-full transition-all relative ${repeatYearly ? 'bg-rose-400' : 'bg-gray-200'}`}>
              <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${repeatYearly ? 'left-4' : 'left-0.5'}`} />
            </div>
            <span className="text-sm text-gray-600">每年重複提醒</span>
          </label>

          <button type="submit" disabled={submitting || !title || !date}
            className="w-full bg-rose-500 text-white font-semibold py-2.5 rounded-xl disabled:opacity-50 text-sm">
            {submitting ? '儲存中...' : '儲存 ❤️'}
          </button>
        </form>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-400">載入中...</div>
      ) : allDates.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-3">🗓️</div>
          <p className="text-gray-400 text-sm">還沒有重要日子，快去新增第一個吧！</p>
        </div>
      ) : (
        <div className="space-y-3 pb-4">
          {allDates.map(d => (
            <DateCard
              key={d.id}
              d={d}
              onDelete={d._pinned || d._readonly ? () => {} : handleDelete}
              onBirthdayClick={d._is_birthday && d.id === '__bday_me__' ? () => navigate('/profile') : null}
            />
          ))}
        </div>
      )}
    </div>
  );
}
