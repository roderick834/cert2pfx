import { useEffect, useCallback, useState } from 'react';
import api from '../api';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}

export function usePush(user) {
  // 'idle' | 'granted' | 'denied' | 'unsupported' | 'error'
  const [status, setStatus] = useState('idle');

  useEffect(() => {
    if (!user) return;
    // Register SW silently — no permission prompt
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
    // Reflect existing permission state
    if (typeof Notification !== 'undefined') {
      if (Notification.permission === 'granted') setStatus('granted');
      else if (Notification.permission === 'denied') setStatus('denied');
    }
  }, [user]);

  // Re-upload subscription if already granted
  useEffect(() => {
    if (status !== 'granted' || !user) return;
    (async () => {
      try {
        const reg = await navigator.serviceWorker.ready;
        const pm = reg.pushManager;
        if (!pm) return;
        const existing = await pm.getSubscription();
        if (existing) {
          await api.post('/push/subscribe', existing.toJSON()).catch(() => {});
        } else {
          const { data } = await api.get('/push/vapid-public-key');
          const sub = await pm.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(data.key) });
          await api.post('/push/subscribe', sub.toJSON());
        }
      } catch {}
    })();
  }, [status, user]);

  const requestPermission = useCallback(async () => {
    try {
      if (!('serviceWorker' in navigator)) return 'unsupported';

      const reg = await navigator.serviceWorker.ready;
      const pm = reg.pushManager;
      if (!pm) return 'unsupported';

      // Request notification permission (must be from user gesture)
      const NotifAPI = window.Notification || Notification;
      const perm = await NotifAPI.requestPermission();
      if (perm !== 'granted') { setStatus('denied'); return perm; }

      const { data } = await api.get('/push/vapid-public-key');
      const sub = await pm.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(data.key) });
      await api.post('/push/subscribe', sub.toJSON());
      setStatus('granted');
      return 'granted';
    } catch (err) {
      console.warn('Push failed:', err.message);
      setStatus('error');
      return 'error';
    }
  }, []);

  return { status, requestPermission };
}
