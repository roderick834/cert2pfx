import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCall } from '../context/CallContext';
import { useTheme, THEMES } from '../context/ThemeContext';

// SVG icon pairs: [outline, filled]
const HomeIcon = ({ filled }) => filled ? (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
    <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
  </svg>
) : (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);

const MemoriesIcon = ({ filled }) => filled ? (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
    <path d="M4 4a2 2 0 012-2h12a2 2 0 012 2v16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 0v16h12V4H6zm1 9l3-3.5L13 13l2-2 3 3.5" />
    <path fillRule="evenodd" clipRule="evenodd" d="M6 4h12v16H6V4zm2 9.2l2.5-3 2.5 3 2-2.4 2.5 3.2H8l2-2.8z" />
    <circle cx="9.5" cy="8.5" r="1.5" />
  </svg>
) : (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <polyline points="21 15 16 10 5 21" />
  </svg>
);

const ChatIcon = ({ filled, forCenter }) => filled ? (
  <svg viewBox="0 0 24 24" fill="currentColor" className={forCenter ? 'w-7 h-7 text-white' : 'w-6 h-6'}>
    <path d="M20 2H4a2 2 0 00-2 2v13a2 2 0 002 2h3l3 3 3-3h5a2 2 0 002-2V4a2 2 0 00-2-2zM8 10a1 1 0 110-2 1 1 0 010 2zm4 0a1 1 0 110-2 1 1 0 010 2zm4 0a1 1 0 110-2 1 1 0 010 2z" />
  </svg>
) : (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={forCenter ? 'w-7 h-7 text-white' : 'w-6 h-6'}>
    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
    <circle cx="9" cy="10" r="0.5" fill="currentColor" />
    <circle cx="12" cy="10" r="0.5" fill="currentColor" />
    <circle cx="15" cy="10" r="0.5" fill="currentColor" />
  </svg>
);

const DatesIcon = ({ filled }) => filled ? (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
    <path d="M12 21.593c-5.63-5.539-11-10.297-11-14.402 0-3.791 3.068-5.191 5.281-5.191 1.312 0 4.151.501 5.719 4.457 1.59-3.968 4.464-4.447 5.726-4.447 2.54 0 5.274 1.621 5.274 5.181 0 4.069-5.136 8.625-11 14.402z" />
  </svg>
) : (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
    <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
  </svg>
);

const ProfileIcon = ({ filled }) => filled ? (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
    <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
  </svg>
) : (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 00-3-3.87" />
    <path d="M16 3.13a4 4 0 010 7.75" />
  </svg>
);

const navItems = [
  { to: '/', label: '首頁',  Icon: HomeIcon },
  { to: '/memories', label: '回憶', Icon: MemoriesIcon },
  { to: '/chat', label: '聊天', Icon: ChatIcon },
  { to: '/dates', label: '紀念日', Icon: DatesIcon },
  { to: '/profile', label: '我們', Icon: ProfileIcon },
];

export default function Layout() {
  const { couple } = useAuth();
  const { status, callType, incomingData, answerCall, endCall } = useCall();
  const { theme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  const onCallPage = location.pathname === '/call';
  const showIncomingBanner = status === 'incoming' && !onCallPage;
  const showActiveMiniBar = (status === 'connected' || status === 'calling') && !onCallPage;

  const currentTheme = THEMES.find(t => t.id === theme);

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
          <span className="text-lg" title={currentTheme?.name}>{currentTheme?.emoji || '🌹'}</span>
        </div>
      </header>

      {/* Incoming call banner */}
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
              <button onClick={endCall} className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center shadow">📵</button>
              <button onClick={() => { answerCall(); navigate('/call'); }} className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shadow">📞</button>
            </div>
          </div>
        </div>
      )}

      {/* Active call mini-bar */}
      {showActiveMiniBar && (
        <div className="sticky top-[57px] z-50 bg-gray-800 text-white shadow-lg cursor-pointer" onClick={() => navigate('/call')}>
          <div className="max-w-lg mx-auto px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-sm font-medium">{status === 'calling' ? '撥號中...' : '通話中 ❤️'}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-400">點擊返回通話</span>
              <button onClick={(e) => { e.stopPropagation(); endCall(); }} className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center text-sm">📵</button>
            </div>
          </div>
        </div>
      )}

      {/* Page content */}
      <main className="flex-1 max-w-lg mx-auto w-full pb-28">
        <Outlet />
      </main>

      {/* Bottom nav — floating pill with elevated center button */}
      <nav className="fixed bottom-4 left-3 right-3 z-40">
        <div className="max-w-lg mx-auto relative">

          {/* Elevated center Chat button — sits above the pill bar */}
          <NavLink to="/chat" className="absolute left-1/2 -translate-x-1/2 -top-7 z-10 flex flex-col items-center gap-1">
            {({ isActive }) => (
              <>
                <div className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all duration-200 active:scale-90 ${
                  isActive
                    ? 'bg-gradient-to-br from-rose-400 to-pink-500 shadow-rose-200'
                    : 'bg-gray-800 shadow-gray-300'
                }`}>
                  <ChatIcon filled={isActive} forCenter={true} />
                </div>
                <span className={`text-[10px] font-semibold transition-colors ${isActive ? 'text-rose-500' : 'text-gray-400'}`}>
                  聊天
                </span>
              </>
            )}
          </NavLink>

          {/* Floating pill bar */}
          <div className="bg-white/95 backdrop-blur-md rounded-[28px] shadow-[0_8px_32px_rgba(0,0,0,0.10)] border border-gray-100 flex items-center px-2 py-1">
            {/* Left side: 首頁, 回憶 */}
            {navItems.slice(0, 2).map(({ to, label, Icon }) => (
              <NavLink key={to} to={to} end={to === '/'} className="flex-1">
                {({ isActive }) => (
                  <div className={`flex flex-col items-center gap-0.5 py-2.5 transition-all duration-200 ${isActive ? 'text-rose-500' : 'text-gray-400'}`}>
                    <div className={`flex items-center justify-center rounded-2xl transition-all duration-200 w-10 h-8 ${isActive ? 'bg-rose-50' : ''}`}>
                      <Icon filled={isActive} />
                    </div>
                    <span className="text-[10px] font-medium leading-none">{label}</span>
                  </div>
                )}
              </NavLink>
            ))}

            {/* Center gap placeholder (for elevated button) */}
            <div className="flex-1" />

            {/* Right side: 紀念日, 我們 */}
            {navItems.slice(3).map(({ to, label, Icon }) => (
              <NavLink key={to} to={to} className="flex-1">
                {({ isActive }) => (
                  <div className={`flex flex-col items-center gap-0.5 py-2.5 transition-all duration-200 ${isActive ? 'text-rose-500' : 'text-gray-400'}`}>
                    <div className={`flex items-center justify-center rounded-2xl transition-all duration-200 w-10 h-8 ${isActive ? 'bg-rose-50' : ''}`}>
                      <Icon filled={isActive} />
                    </div>
                    <span className="text-[10px] font-medium leading-none">{label}</span>
                  </div>
                )}
              </NavLink>
            ))}
          </div>
        </div>
      </nav>
    </div>
  );
}
