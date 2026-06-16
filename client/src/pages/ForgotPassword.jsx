import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api';
import { getOrCreateDeviceToken } from '../context/AuthContext';

const STEPS = { EMAIL: 'email', NEW_PW: 'newpw', DONE: 'done', NO_DEVICE: 'no_device' };

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState(STEPS.EMAIL);
  const [email, setEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [username, setUsername] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleVerifyDevice = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const deviceToken = getOrCreateDeviceToken();
      const res = await api.post('/auth/forgot-password', { email, deviceToken });
      setResetToken(res.data.resetToken);
      setUsername(res.data.username);
      setStep(STEPS.NEW_PW);
    } catch (err) {
      const msg = err.response?.data?.error || '驗證失敗';
      if (msg.includes('未綁定') || msg.includes('找不到')) {
        setStep(STEPS.NO_DEVICE);
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    if (newPw !== confirmPw) { setError('兩次密碼不一致'); return; }
    if (newPw.length < 6) { setError('密碼至少需要 6 個字元'); return; }
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { resetToken, newPassword: newPw });
      setStep(STEPS.DONE);
    } catch (err) {
      setError(err.response?.data?.error || '重設失敗，請重試');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-100 via-pink-50 to-red-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl p-8 w-full max-w-sm">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">
            {step === STEPS.DONE ? '✅' : step === STEPS.NO_DEVICE ? '📵' : '🔐'}
          </div>
          <h1 className="text-xl font-bold text-gray-800">
            {step === STEPS.DONE ? '密碼已重設！' :
             step === STEPS.NO_DEVICE ? '此裝置未綁定' :
             step === STEPS.NEW_PW ? `嗨，${username}！` :
             '忘記密碼'}
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            {step === STEPS.EMAIL ? '用此裝置驗證你的帳號' :
             step === STEPS.NEW_PW ? '請設定新密碼' :
             step === STEPS.NO_DEVICE ? '請從曾登入過的裝置操作' :
             '可以用新密碼登入了'}
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm mb-4">
            {error}
          </div>
        )}

        {/* Step 1: Email entry */}
        {step === STEPS.EMAIL && (
          <form onSubmit={handleVerifyDevice} className="space-y-4">
            <div className="bg-rose-50 rounded-2xl p-4 text-sm text-gray-600 space-y-1 mb-2">
              <p className="font-medium text-rose-600">📱 裝置綁定驗證</p>
              <p>此功能會確認你是否在<strong>曾登入過</strong>的裝置上操作，無需電子郵件驗證。</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">帳號電子信箱</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full border border-rose-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
              />
            </div>
            <button type="submit" disabled={loading}
              className="w-full bg-rose-500 hover:bg-rose-600 text-white font-semibold py-3 rounded-xl transition-all disabled:opacity-60">
              {loading ? '驗證中...' : '用此裝置驗證身份'}
            </button>
          </form>
        )}

        {/* Step 2: New password */}
        {step === STEPS.NEW_PW && (
          <form onSubmit={handleReset} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">新密碼</label>
              <input
                type="password"
                required
                minLength={6}
                value={newPw}
                onChange={e => setNewPw(e.target.value)}
                placeholder="至少 6 個字元"
                className="w-full border border-rose-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">確認新密碼</label>
              <input
                type="password"
                required
                value={confirmPw}
                onChange={e => setConfirmPw(e.target.value)}
                placeholder="再輸入一次"
                className="w-full border border-rose-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
              />
            </div>
            <button type="submit" disabled={loading}
              className="w-full bg-rose-500 hover:bg-rose-600 text-white font-semibold py-3 rounded-xl transition-all disabled:opacity-60">
              {loading ? '重設中...' : '確認重設密碼'}
            </button>
          </form>
        )}

        {/* Step 3: Done */}
        {step === STEPS.DONE && (
          <button onClick={() => navigate('/login')}
            className="w-full bg-rose-500 hover:bg-rose-600 text-white font-semibold py-3 rounded-xl transition-all">
            前往登入
          </button>
        )}

        {/* No device bound */}
        {step === STEPS.NO_DEVICE && (
          <div className="space-y-4">
            <div className="bg-amber-50 rounded-2xl p-4 text-sm text-amber-800 space-y-2">
              <p>此裝置從未登入過這個帳號，無法自動驗證。</p>
              <p className="font-medium">解決方法：</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>找到你曾經登入過的手機或電腦</li>
                <li>在那個裝置上開啟此頁面進行重設</li>
                <li>若所有裝置都無法存取，請聯繫另一半協助</li>
              </ul>
            </div>
            <button onClick={() => setStep(STEPS.EMAIL)}
              className="w-full border-2 border-rose-300 text-rose-500 font-semibold py-3 rounded-xl">
              重新輸入信箱
            </button>
          </div>
        )}

        <p className="text-center text-sm text-gray-400 mt-6">
          <Link to="/login" className="text-rose-500 font-medium hover:underline">← 返回登入</Link>
        </p>
      </div>
    </div>
  );
}
