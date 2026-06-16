import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePushContext } from '../App';
import api from '../api';

export default function Profile() {
  const { user, couple, logout, refreshCouple } = useAuth();
  const navigate = useNavigate();
  const { status: pushStatus, requestPermission } = usePushContext();
  const [pushLoading, setPushLoading] = useState(false);
  const [pushMsg, setPushMsg] = useState('');

  // ntfy state
  const [ntfyTopic, setNtfyTopic] = useState('');
  const [ntfyInput, setNtfyInput] = useState('');
  const [ntfyEditing, setNtfyEditing] = useState(false);
  const [ntfySaving, setNtfySaving] = useState(false);
  const [ntfyMsg, setNtfyMsg] = useState('');

  useEffect(() => {
    if (!user) return;
    api.get('/push/ntfy').then(r => {
      setNtfyTopic(r.data.topic || '');
      setNtfyInput(r.data.topic || '');
    }).catch(() => {});
  }, [user]);

  const handleEnablePush = async () => {
    setPushLoading(true);
    const result = await requestPermission();
    setPushLoading(false);
    if (result === 'granted') setPushMsg('✅ 通知已開啟！');
    else if (result === 'denied') setPushMsg('❌ 已拒絕，請到系統設定手動開啟');
    else setPushMsg('開啟失敗，請稍後再試');
    setTimeout(() => setPushMsg(''), 4000);
  };

  const saveNtfy = async () => {
    if (!ntfyInput.trim()) return;
    setNtfySaving(true);
    try {
      await api.post('/push/ntfy', { topic: ntfyInput.trim() });
      setNtfyTopic(ntfyInput.trim());
      setNtfyEditing(false);
      setNtfyMsg('✅ 已儲存！記得在 ntfy App 訂閱此頻道');
      setTimeout(() => setNtfyMsg(''), 4000);
    } catch { setNtfyMsg('儲存失敗'); }
    finally { setNtfySaving(false); }
  };

  const [mode, setMode] = useState(null);
  const [coupleDate, setCoupleDate] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [myCode, setMyCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const res = await api.post('/couples/create', { couple_date: coupleDate });
      setMyCode(res.data.couple.invite_code);
      await refreshCouple();
    } catch (err) {
      setError(err.response?.data?.error || '建立失敗');
    } finally { setLoading(false); }
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await api.post('/couples/join', { invite_code: inviteCode });
      await refreshCouple();
    } catch (err) {
      setError(err.response?.data?.error || '加入失敗');
    } finally { setLoading(false); }
  };

  const copyCode = () => {
    const code = couple?.couple?.invite_code || myCode;
    if (code) {
      navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const startDate = couple?.couple?.couple_date || couple?.couple?.created_at;
  const formattedStart = startDate
    ? new Date(startDate).toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric' })
    : null;

  return (
    <div className="px-4 py-6 space-y-4">
      {/* User info card */}
      <div className="bg-white rounded-2xl shadow-sm p-5 flex items-center gap-4">
        <div className="w-14 h-14 bg-gradient-to-br from-rose-400 to-pink-500 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-md">
          {user?.username?.[0]?.toUpperCase() || '?'}
        </div>
        <div>
          <p className="text-lg font-bold text-gray-800">{user?.username}</p>
          <p className="text-sm text-gray-400">{user?.email}</p>
        </div>
      </div>

      {/* Couple info */}
      {couple?.couple && (
        <div className="bg-gradient-to-br from-rose-400 to-pink-500 text-white rounded-2xl p-5 shadow-md">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs opacity-75 uppercase tracking-wide font-semibold">在一起</p>
              <div className="flex items-baseline gap-1">
                <p className="text-4xl font-bold">{couple.daysTogether}</p>
                <p className="text-lg opacity-80">天</p>
              </div>
            </div>
            <div className="text-5xl">💕</div>
          </div>

          {couple.partner ? (
            <div className="flex items-center gap-3 bg-white/20 rounded-xl p-3 mb-3">
              <div className="w-10 h-10 bg-white/30 rounded-full flex items-center justify-center text-lg font-bold">
                {couple.partner.username[0].toUpperCase()}
              </div>
              <div>
                <p className="text-xs opacity-75">另一半</p>
                <p className="font-semibold">{couple.partner.username}</p>
              </div>
            </div>
          ) : (
            <div className="bg-white/20 rounded-xl p-3 mb-3">
              <p className="text-sm opacity-75">另一半還沒加入</p>
            </div>
          )}

          {formattedStart && (
            <p className="text-sm opacity-80 mb-3">❤️ 相愛從 {formattedStart} 開始</p>
          )}

          <div>
            <p className="text-xs opacity-75 mb-1">邀請碼</p>
            <div className="flex items-center gap-2">
              <div className="bg-white/20 rounded-xl px-4 py-2 flex-1">
                <span className="text-xl font-bold tracking-widest">{couple.couple.invite_code}</span>
              </div>
              <button onClick={copyCode}
                className="bg-white/30 hover:bg-white/40 px-3 py-2 rounded-xl text-sm font-medium transition-all">
                {copied ? '已複製！' : '複製'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pairing (if not paired) */}
      {!couple && (
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <h3 className="text-lg font-bold text-gray-800 mb-4 text-center">連結另一半</h3>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm mb-4">{error}</div>
          )}

          {myCode && (
            <div className="text-center mb-4">
              <p className="text-gray-500 text-sm mb-2">把邀請碼分享給另一半：</p>
              <div className="bg-rose-50 border-2 border-rose-300 rounded-2xl py-5 px-4 mb-3">
                <span className="text-3xl font-bold tracking-widest text-rose-600">{myCode}</span>
              </div>
              <button onClick={() => { navigator.clipboard.writeText(myCode); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                className="text-rose-500 text-sm font-medium">
                {copied ? '已複製！' : '複製邀請碼'}
              </button>
            </div>
          )}

          {!myCode && !mode && (
            <div className="space-y-3">
              <button onClick={() => setMode('create')}
                className="w-full bg-rose-500 hover:bg-rose-600 text-white font-semibold py-4 rounded-xl transition-all">
                💌 建立情侶空間
              </button>
              <button onClick={() => setMode('join')}
                className="w-full border-2 border-rose-400 text-rose-500 hover:bg-rose-50 font-semibold py-4 rounded-xl transition-all">
                🔑 用邀請碼加入
              </button>
            </div>
          )}

          {!myCode && mode === 'create' && (
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">在一起的日期（選填）</label>
                <input type="date" value={coupleDate} onChange={e => setCoupleDate(e.target.value)}
                  className="w-full border border-rose-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300" />
              </div>
              <button type="submit" disabled={loading}
                className="w-full bg-rose-500 hover:bg-rose-600 text-white font-semibold py-3 rounded-xl transition-all disabled:opacity-60">
                {loading ? '建立中...' : '建立並取得邀請碼'}
              </button>
              <button type="button" onClick={() => setMode(null)} className="w-full text-gray-400 py-2 text-sm">返回</button>
            </form>
          )}

          {!myCode && mode === 'join' && (
            <form onSubmit={handleJoin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">邀請碼</label>
                <input type="text" required value={inviteCode} onChange={e => setInviteCode(e.target.value.toUpperCase())}
                  placeholder="輸入邀請碼"
                  className="w-full border border-rose-200 rounded-xl px-4 py-3 text-lg text-center font-bold tracking-widest focus:outline-none focus:ring-2 focus:ring-rose-300" />
              </div>
              <button type="submit" disabled={loading}
                className="w-full bg-rose-500 hover:bg-rose-600 text-white font-semibold py-3 rounded-xl transition-all disabled:opacity-60">
                {loading ? '加入中...' : '加入'}
              </button>
              <button type="button" onClick={() => setMode(null)} className="w-full text-gray-400 py-2 text-sm">返回</button>
            </form>
          )}
        </div>
      )}

      {/* Quick links */}
      {couple && (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {[
            { icon: '📞', label: '語音 / 視訊通話', to: '/call' },
            { icon: '🎨', label: '貼圖工坊', to: '/stickers' },
          ].map(({ icon, label, to }) => (
            <button key={to} onClick={() => navigate(to)}
              className="w-full flex items-center gap-3 px-4 py-3.5 border-b border-gray-50 last:border-0 text-left hover:bg-gray-50 transition-colors">
              <span className="text-xl">{icon}</span>
              <span className="text-sm font-medium text-gray-700">{label}</span>
              <span className="ml-auto text-gray-300">›</span>
            </button>
          ))}
        </div>
      )}

      {/* Notifications */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 pt-5 pb-3 border-b border-gray-100">
          <p className="font-semibold text-gray-700 text-sm mb-1">通知設定</p>
          <p className="text-xs text-gray-400">選擇一種方式接收訊息和來電通知</p>
        </div>

        {/* Web Push (Chrome/newer Safari) */}
        <div className="px-5 py-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700">瀏覽器推播</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {pushStatus === 'granted' ? '✅ 已開啟' :
                  pushStatus === 'denied' ? '已拒絕（去設定 → Safari → 通知開啟）' :
                  pushStatus === 'unsupported' ? '不支援（請改用 ntfy）' :
                  'Chrome / Safari'}
              </p>
            </div>
            {pushStatus !== 'granted' && pushStatus !== 'denied' && (
              <button onClick={handleEnablePush} disabled={pushLoading}
                className="bg-rose-500 text-white text-xs font-semibold px-3 py-2 rounded-xl disabled:opacity-60">
                {pushLoading ? '開啟中...' : '開啟'}
              </button>
            )}
          </div>
          {pushMsg && <p className="text-xs mt-2 text-gray-500">{pushMsg}</p>}
        </div>

        {/* ntfy.sh */}
        <div className="px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-700">ntfy App 通知</p>
              <p className="text-xs text-gray-400 mt-0.5">支援所有 iOS / Android，需安裝 ntfy App</p>
              {ntfyTopic && !ntfyEditing && (
                <p className="text-xs text-rose-500 mt-1 font-mono break-all">頻道：{ntfyTopic}</p>
              )}
            </div>
            <button onClick={() => setNtfyEditing(e => !e)}
              className="text-xs text-rose-400 font-medium flex-shrink-0 mt-0.5">
              {ntfyEditing ? '取消' : ntfyTopic ? '修改' : '設定'}
            </button>
          </div>

          {ntfyEditing && (
            <div className="mt-3 space-y-2">
              <input
                value={ntfyInput}
                onChange={e => setNtfyInput(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ''))}
                placeholder="輸入頻道名稱（英數字）"
                className="w-full border border-rose-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
              />
              <div className="bg-rose-50 rounded-xl p-3 text-xs text-gray-500 space-y-1">
                <p>1. 安裝 <strong>ntfy</strong> App（App Store / Google Play）</p>
                <p>2. 點 ＋ 訂閱你輸入的頻道名稱</p>
                <p>3. 儲存後就能收到通知</p>
              </div>
              <button onClick={saveNtfy} disabled={ntfySaving || !ntfyInput.trim()}
                className="w-full bg-rose-500 text-white text-sm font-semibold py-2.5 rounded-xl disabled:opacity-50">
                {ntfySaving ? '儲存中...' : '儲存'}
              </button>
            </div>
          )}
          {ntfyMsg && <p className="text-xs mt-2 text-gray-500">{ntfyMsg}</p>}
        </div>
      </div>

      <button onClick={() => { logout(); navigate('/login'); }}
        className="w-full border-2 border-red-200 text-red-400 hover:bg-red-50 font-semibold py-3 rounded-xl transition-all text-sm">
        登出
      </button>
    </div>
  );
}
