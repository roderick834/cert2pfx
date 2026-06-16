import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext({ socket: null, partnerOnline: false });

export function SocketProvider({ children }) {
  const { user, couple } = useAuth();
  const socketRef = useRef(null);
  const [socket, setSocket] = useState(null);
  const [partnerOnline, setPartnerOnline] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!user || !token) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
      }
      return;
    }

    const s = io('/', {
      auth: { token },
      reconnection: true,
      reconnectionDelay: 1000,
    });

    socketRef.current = s;
    setSocket(s);

    return () => {
      s.disconnect();
      socketRef.current = null;
      setSocket(null);
      setPartnerOnline(false);
    };
  }, [user]);

  useEffect(() => {
    if (!socket || !couple?.partner?.id) return;
    const partnerId = couple.partner.id;

    const handleStatus = ({ userId, online }) => {
      if (userId === partnerId) setPartnerOnline(online);
    };

    socket.on('partner-status', handleStatus);
    return () => socket.off('partner-status', handleStatus);
  }, [socket, couple]);

  return (
    <SocketContext.Provider value={{ socket, partnerOnline }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext).socket;
}

export function usePartnerOnline() {
  return useContext(SocketContext).partnerOnline;
}
