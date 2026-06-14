import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { to: '/', icon: '🏠', label: '回憶' },
  { to: '/chat', icon: '💬', label: '聊天' },
  { to: '/call', icon: '📞', label: '通話' },
  { to: '/stickers', icon: '🎨', label: '貼圖' },
  { to: '/profile', icon: '💑', label: '我們' },
];

export default function Layout() {
  const { user, couple } = useAuth();

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
          <span className="text-sm text-gray-500">{user?.username}</span>
        </div>
      </header>

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
