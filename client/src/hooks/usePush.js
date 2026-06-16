import { useEffect, useCallback, useState } from 'react';
import api from '../api';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}

const supported = typeof window !== 'undefined'
  && 'serviceWorker' in navigator
  && 'PushManager' in window
  && 'Notification' in window;

export function usePush(user) {
  const [status, setStatus] = useState('idle'); // 'idle' | 'granted' | 'denied' | 'unsupported'

  // Register service worker silently on load (no permission prompt)
  useEffect(() => {
    if (!user || !supported) { setStatus('unsupported'); return; }
    navigator.serviceWorker.register('/sw.js').catch(() => {});
    setStatus(Notification.permission === 'granted' ? 'granted' : Notification.permission === 'denied' ? 'denied' : 'idle');
  }, [user]);

  // Re-subscribe if already granted (e.g. after page refresh)
  useEffect(() => {
    if (status !== 'granted' || !user) return;
    (async () => {
      try {
        const reg = await navigator.serviceWorker.ready;
        const existing = await reg.pushManager.getSubscription();
        if (existing) {
          await api.post('/push/subscribe', existing.toJSON()).catch(() => {});
          return;
        }
        const { data } = await api.get('/push/vapid-public-key');
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(data.key),
        });
        await api.post('/push/subscribe', sub.toJSON());
      } catch {}
    })();
  }, [status, user]);

  // Called from a button click (user gesture required by browsers)
  const requestPermission = useCallback(async () => {
    if (!supported) return 'unsupported';
    try {
      const reg = await navigator.serviceWorker.ready;
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

  return { status, requestPermission, supported };
}
