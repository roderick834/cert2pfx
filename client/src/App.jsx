import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { CallProvider } from './context/CallContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Pairing from './pages/Pairing';
import Home from './pages/Home';
import Memories from './pages/Memories';
import Chat from './pages/Chat';
import Call from './pages/Call';
import StickerMaker from './pages/StickerMaker';
import Profile from './pages/Profile';

const Spinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-rose-50">
    <div className="text-5xl animate-pulse">💕</div>
  </div>
);

function RequireAuth() {
  const { user, couple, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (!couple) return <Navigate to="/pairing" replace />;
  return <Layout />;
}

function AppRoutes() {
  const { user, couple, loading } = useAuth();
  if (loading) return <Spinner />;

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/register" element={user ? <Navigate to="/" replace /> : <Register />} />
      <Route
        path="/pairing"
        element={
          !user ? <Navigate to="/login" replace /> :
          couple ? <Navigate to="/" replace /> :
          <Pairing />
        }
      />
      <Route element={<RequireAuth />}>
        <Route path="/" element={<Home />} />
        <Route path="/memories" element={<Memories />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/call" element={<Call />} />
        <Route path="/stickers" element={<StickerMaker />} />
        <Route path="/profile" element={<Profile />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SocketProvider>
          <CallProvider>
            <AppRoutes />
          </CallProvider>
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
