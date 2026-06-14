import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';

function formatDate(dateStr) {
  if (!dateStr) return 'Not set';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

export default function Profile() {
  const { user, couple, logout, refreshCouple } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState(null); // null | 'create' | 'join'
  const [coupleDate, setCoupleDate] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [myCode, setMyCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/couples/create', { couple_date: coupleDate });
      setMyCode(res.data.couple.invite_code);
      await refreshCouple();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create');
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
      setError(err.response?.data?.error || 'Failed to join');
    } finally {
      setLoading(false);
    }
  };

  const copyCode = () => {
    if (couple?.couple?.invite_code || myCode) {
      navigator.clipboard.writeText(couple?.couple?.invite_code || myCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="px-4 py-6">
      {/* User info */}
      <div className="bg-white rounded-2xl shadow-sm p-5 mb-4 flex items-center gap-4">
        <div className="w-14 h-14 bg-gradient-to-br from-rose-400 to-pink-500 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-md">
          {user?.username?.[0]?.toUpperCase() || '?'}
        </div>
        <div>
          <p className="text-lg font-bold text-gray-800">{user?.username}</p>
          <p className="text-sm text-gray-400">{user?.email}</p>
        </div>
      </div>

      {/* Couple info (if paired) */}
      {couple && couple.couple && (
        <div className="bg-gradient-to-br from-rose-400 to-pink-500 text-white rounded-2xl p-5 mb-4 shadow-md">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs opacity-75 uppercase tracking-wide font-semibold">Days Together</p>
              <p className="text-4xl font-bold">{couple.daysTogether}</p>
            </div>
            <div className="text-5xl">💕</div>
          </div>

          {couple.partner && (
            <div className="flex items-center gap-3 bg-white/20 rounded-xl p-3 mb-3">
              <div className="w-10 h-10 bg-white/30 rounded-full flex items-center justify-center text-lg font-bold">
                {couple.partner.username[0].toUpperCase()}
              </div>
              <div>
                <p className="text-xs opacity-75">Your partner</p>
                <p className="font-semibold">{couple.partner.username}</p>
              </div>
            </div>
          )}

          {!couple.partner && (
            <div className="bg-white/20 rounded-xl p-3 mb-3">
              <p className="text-sm opacity-75">Partner hasn't joined yet</p>
            </div>
          )}

          {couple.couple.couple_date && (
            <div className="text-sm opacity-80 mb-3">
              Anniversary: {formatDate(couple.couple.couple_date)}
            </div>
          )}

          {/* Invite code display */}
          <div>
            <p className="text-xs opacity-75 mb-1">Your invite code</p>
            <div className="flex items-center gap-2">
              <div className="bg-white/20 rounded-xl px-4 py-2 flex-1">
                <span className="text-xl font-bold tracking-widest">{couple.couple.invite_code}</span>
              </div>
              <button
                onClick={copyCode}
                className="bg-white/30 hover:bg-white/40 px-3 py-2 rounded-xl text-sm font-medium transition-all"
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pairing section (if not paired) */}
      {!couple && (
        <div className="bg-white rounded-2xl shadow-sm p-5 mb-4">
          <h3 className="text-lg font-bold text-gray-800 mb-4 text-center">Connect with your partner</h3>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm mb-4">
              {error}
            </div>
          )}

          {myCode && (
            <div className="text-center mb-4">
              <p className="text-gray-500 text-sm mb-2">Share this code with your partner:</p>
              <div className="bg-rose-50 border-2 border-rose-300 rounded-2xl py-5 px-4 mb-3">
                <span className="text-3xl font-bold tracking-widest text-rose-600">{myCode}</span>
              </div>
              <button
                onClick={() => { navigator.clipboard.writeText(myCode); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                className="text-rose-500 text-sm font-medium"
              >
                {copied ? 'Copied!' : 'Copy code'}
              </button>
            </div>
          )}

          {!myCode && !mode && (
            <div className="space-y-3">
              <button
                onClick={() => setMode('create')}
                className="w-full bg-rose-500 hover:bg-rose-600 text-white font-semibold py-4 rounded-xl transition-all"
              >
                💌 Create Couple Space
              </button>
              <button
                onClick={() => setMode('join')}
                className="w-full border-2 border-rose-400 text-rose-500 hover:bg-rose-50 font-semibold py-4 rounded-xl transition-all"
              >
                🔑 Join with Invite Code
              </button>
            </div>
          )}

          {!myCode && mode === 'create' && (
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Anniversary date (optional)</label>
                <input
                  type="date"
                  value={coupleDate}
                  onChange={(e) => setCoupleDate(e.target.value)}
                  className="w-full border border-rose-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-rose-500 hover:bg-rose-600 text-white font-semibold py-3 rounded-xl transition-all disabled:opacity-60"
              >
                {loading ? 'Creating...' : 'Create & Get Invite Code'}
              </button>
              <button type="button" onClick={() => setMode(null)} className="w-full text-gray-400 py-2 text-sm">
                Back
              </button>
            </form>
          )}

          {!myCode && mode === 'join' && (
            <form onSubmit={handleJoin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Invite Code</label>
                <input
                  type="text"
                  required
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  placeholder="Enter code"
                  className="w-full border border-rose-200 rounded-xl px-4 py-3 text-lg text-center font-bold tracking-widest focus:outline-none focus:ring-2 focus:ring-rose-300"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-rose-500 hover:bg-rose-600 text-white font-semibold py-3 rounded-xl transition-all disabled:opacity-60"
              >
                {loading ? 'Joining...' : 'Join'}
              </button>
              <button type="button" onClick={() => setMode(null)} className="w-full text-gray-400 py-2 text-sm">
                Back
              </button>
            </form>
          )}
        </div>
      )}

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="w-full border-2 border-red-300 text-red-500 hover:bg-red-50 font-semibold py-3 rounded-xl transition-all"
      >
        Sign Out
      </button>
    </div>
  );
}
