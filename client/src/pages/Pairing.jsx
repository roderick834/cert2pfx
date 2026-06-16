import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api';

export default function Pairing() {
  const { refreshCouple } = useAuth();
  const [mode, setMode] = useState(null); // 'create' | 'join'
  const [coupleDate, setCoupleDate] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [myCode, setMyCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/couples/create', { couple_date: coupleDate });
      setMyCode(res.data.couple.invite_code);
    } catch (err) {
      setError(err.response?.data?.error || '建立失敗');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/couples/join', { invite_code: inviteCode });
      await refreshCouple();
    } catch (err) {
      setError(err.response?.data?.error || '加入失敗');
    } finally {
      setLoading(false);
    }
  };

  const handleDone = async () => {
    await refreshCouple();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-100 via-pink-50 to-red-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl p-8 w-full max-w-sm animate-fade-in">
        <div className="text-center mb-8">
          <div className="text-6xl mb-3">💑</div>
          <h1 className="text-2xl font-bold text-rose-600">連結你們</h1>
          <p className="text-gray-400 text-sm mt-1">與另一半建立你們的專屬空間</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm mb-4">
            {error}
          </div>
        )}

        {/* Created — show code */}
        {myCode && (
          <div className="text-center">
            <p className="text-gray-600 mb-2 text-sm">把這個邀請碼傳給另一半：</p>
            <div className="bg-rose-50 border-2 border-rose-300 rounded-2xl py-6 px-4 mb-4">
              <span className="text-4xl font-bold tracking-widest text-rose-600">{myCode}</span>
            </div>
            <p className="text-xs text-gray-400 mb-6">另一半輸入此碼後，你們就連結了！</p>
            <button
              onClick={handleDone}
              className="w-full bg-rose-500 hover:bg-rose-600 text-white font-semibold py-3 rounded-xl transition-all"
            >
              重新整理
            </button>
          </div>
        )}

        {!myCode && !mode && (
          <div className="space-y-3">
            <button
              onClick={() => setMode('create')}
              className="w-full bg-rose-500 hover:bg-rose-600 text-white font-semibold py-4 rounded-xl transition-all"
            >
              💌 建立情侶空間
            </button>
            <button
              onClick={() => setMode('join')}
              className="w-full border-2 border-rose-400 text-rose-500 hover:bg-rose-50 font-semibold py-4 rounded-xl transition-all"
            >
              🔑 輸入邀請碼加入
            </button>
          </div>
        )}

        {!myCode && mode === 'create' && (
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">在一起紀念日（選填）</label>
              <input
                type="date"
                value={coupleDate}
                onChange={(e) => setCoupleDate(e.target.value)}
                className="w-full border border-rose-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 transition"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-rose-500 hover:bg-rose-600 text-white font-semibold py-3 rounded-xl transition-all disabled:opacity-60"
            >
              {loading ? '建立中...' : '建立並取得邀請碼'}
            </button>
            <button type="button" onClick={() => setMode(null)} className="w-full text-gray-400 py-2 text-sm">
              返回
            </button>
          </form>
        )}

        {!myCode && mode === 'join' && (
          <form onSubmit={handleJoin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">邀請碼</label>
              <input
                type="text"
                required
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                placeholder="輸入 8 碼邀請碼"
                maxLength={8}
                className="w-full border border-rose-200 rounded-xl px-4 py-3 text-sm text-center text-2xl tracking-widest font-bold focus:outline-none focus:ring-2 focus:ring-rose-300 transition"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-rose-500 hover:bg-rose-600 text-white font-semibold py-3 rounded-xl transition-all disabled:opacity-60"
            >
              {loading ? '加入中...' : '加入'}
            </button>
            <button type="button" onClick={() => setMode(null)} className="w-full text-gray-400 py-2 text-sm">
              返回
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
