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
  const [errorDetail, setErrorDetail] = useState('');

  useEffect(() => {
    if (!user) return;
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
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
      if (!('serviceWorker' in navigator)) {
        setErrorDetail('不支援 Service Worker');
        setStatus('unsupported');
        return 'unsupported';
      }

      let reg;
      try {
        reg = await navigator.serviceWorker.ready;
      } catch (e) {
        setErrorDetail('Service Worker 未就緒：' + e.message);
        setStatus('error');
        return 'error';
      }

      const pm = reg.pushManager;
      if (!pm) {
        setErrorDetail('此瀏覽器不支援推播（需安裝為桌面 App）');
        setStatus('unsupported');
        return 'unsupported';
      }

      // Request notification permission
      let perm;
      try {
        const NotifAPI = window.Notification || Notification;
        if (!NotifAPI) {
          setErrorDetail('Notification API 不可用');
          setStatus('unsupported');
          return 'unsupported';
        }
        perm = await NotifAPI.requestPermission();
      } catch (e) {
        setErrorDetail('請求通知權限失敗：' + e.message);
        setStatus('error');
        return 'error';
      }

      if (perm !== 'granted') {
        setStatus('denied');
        return perm;
      }

      // Subscribe to push
      let sub;
      try {
        const { data } = await api.get('/push/vapid-public-key');
        sub = await pm.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(data.key),
        });
      } catch (e) {
        setErrorDetail('訂閱推播失敗：' + e.message);
        setStatus('error');
        return 'error';
      }

      try {
        await api.post('/push/subscribe', sub.toJSON());
      } catch (e) {
        setErrorDetail('上傳訂閱失敗：' + e.message);
        setStatus('error');
        return 'error';
      }

      setStatus('granted');
      setErrorDetail('');
      return 'granted';
    } catch (err) {
      console.warn('Push failed:', err.message);
      setErrorDetail(err.message || '未知錯誤');
      setStatus('error');
      return 'error';
    }
  }, []);

  return { status, errorDetail, requestPermission };
}
