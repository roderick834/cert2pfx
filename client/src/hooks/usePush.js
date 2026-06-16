import { useEffect, useCallback, useState } from 'react';
import api from '../api';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}

// Only require serviceWorker + Notification — PushManager checked dynamically
// because Safari exposes it on registration, not on window
const basicSupport = typeof window !== 'undefined'
  && 'serviceWorker' in navigator
  && 'Notification' in window;

export function usePush(user) {
  const [status, setStatus] = useState('idle'); // idle | granted | denied | unsupported

  useEffect(() => {
    if (!user || !basicSupport) { setStatus('unsupported'); return; }
    navigator.serviceWorker.register('/sw.js').catch(() => {});
    const p = Notification.permission;
    if (p === 'granted') setStatus('granted');
    else if (p === 'denied') setStatus('denied');
    else setStatus('idle');
  }, [user]);

  // Re-upload existing subscription after page refresh
  useEffect(() => {
    if (status !== 'granted' || !user) return;
    (async () => {
      try {
        const reg = await navigator.serviceWorker.ready;
        if (!reg.pushManager) return;
        const existing = await reg.pushManager.getSubscription();
        if (existing) await api.post('/push/subscribe', existing.toJSON()).catch(() => {});
        else {
          const { data } = await api.get('/push/vapid-public-key');
          const sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(data.key),
          });
          await api.post('/push/subscribe', sub.toJSON());
        }
      } catch {}
    })();
  }, [status, user]);

  const requestPermission = useCallback(async () => {
    if (!basicSupport) return 'unsupported';
    try {
      const reg = await navigator.serviceWorker.ready;
      if (!reg.pushManager) { setStatus('unsupported'); return 'unsupported'; }

      const perm = await Notification.requestPermission();
      if (perm !== 'granted') { setStatus('denied'); return perm; }

      const { data } = await api.get('/push/vapid-public-key');
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(data.key),
      });
      await api.post('/push/subscribe', sub.toJSON());
      setStatus('granted');
      return 'granted';
    } catch (err) {
      console.warn('Push failed:', err.message);
      return 'error';
    }
  }, []);

  return { status, requestPermission, supported: basicSupport };
}
