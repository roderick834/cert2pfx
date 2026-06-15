import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCall } from '../context/CallContext';
import { useTheme } from '../context/ThemeContext';

const navItems = [
  { to: '/', icon: '🏠', label: '首頁' },
  { to: '/memories', icon: '📷', label: '回憶' },
  { to: '/chat', icon: '💬', label: '聊天' },
  { to: '/dates', icon: '💌', label: '紀念日' },
  { to: '/profile', icon: '💑', label: '我們' },
];

export default function Layout() {
  const { user, couple } = useAuth();
  const { status, callType, incomingData, answerCall, endCall } = useCall();
  const { dark, toggleDark } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  const onCallPage = location.pathname === '/call';
  const showIncomingBanner = status === 'incoming' && !onCallPage;
  const showActiveMiniBar = (status === 'connected' || status === 'calling') && !onCallPage;

  return (
    <div className="flex flex-col min-h-screen bg-rose-50">
      {/* Top bar */}
      <header className="bg-white shadow-sm sticky top-0 z-40 border-b border-rose-100">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <span className="text-xl font-bold text-rose-500">💕 Together</span>
          {couple?.daysTogether != null && (
            <span className="text-sm text-rose-400 font-medium">
              在一起 {couple.daysTogether} 天 ❤️
            </span>
          )}
          <button
            onClick={toggleDark}
            className="w-8 h-8 rounded-full flex items-center justify-center text-lg bg-gray-100 dark:bg-gray-700 transition-colors"
            aria-label="切換深色模式"
          >
            {dark ? '☀️' : '🌙'}
          </button>
        </div>
      </header>

      {/* Incoming call banner (shown on all pages except /call) */}
      {showIncomingBanner && (
        <div className="sticky top-[57px] z-50 bg-green-600 text-white shadow-lg">
          <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xl animate-bounce">📞</span>
              <div>
                <p className="font-semibold text-sm">{incomingData?.from} 來電</p>
                <p className="text-xs text-green-100">{callType === 'video' ? '視訊通話' : '語音通話'}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={endCall}
                className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center shadow"
              >
                📵
              </button>
              <button
                onClick={() => { answerCall(); navigate('/call'); }}
                className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shadow"
              >
                📞
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Active call mini-bar (shown when in call but browsing other pages) */}
      {showActiveMiniBar && (
        <div
          className="sticky top-[57px] z-50 bg-gray-800 text-white shadow-lg cursor-pointer"
          onClick={() => navigate('/call')}
        >
          <div className="max-w-lg mx-auto px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-sm font-medium">
                {status === 'calling' ? '撥號中...' : '通話中 ❤️'}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-400">點擊返回通話</span>
              <button
                onClick={(e) => { e.stopPropagation(); endCall(); }}
                className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center text-sm"
              >
                📵
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Page content */}
      <main className="flex-1 max-w-lg mx-auto w-full pb-20">
        <Outlet />
      </main>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-rose-100 shadow-lg z-40">
        <div className="max-w-lg mx-auto flex justify-around items-center py-2">
          {navItems.map(({ to, icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex flex-col items-center px-3 py-1 rounded-xl transition-all ${
                  isActive ? 'text-rose-500 bg-rose-50 scale-110' : 'text-gray-400'
                }`
              }
            >
              <span className="text-xl">{icon}</span>
              <span className="text-xs mt-0.5 font-medium">{label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
