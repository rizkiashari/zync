import { useState, useEffect, useCallback } from 'react';
import api from '../lib/api';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

async function getVAPIDKey() {
  try {
    const res = await api.get('/api/push/vapid-key');
    return res.data?.data?.public_key || null;
  } catch {
    return null;
  }
}

async function registerSW() {
  if (!('serviceWorker' in navigator)) return null;
  try {
    const reg = await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready;
    return reg;
  } catch {
    return null;
  }
}

async function subscribeToPush(vapidKey) {
  const reg = await registerSW();
  if (!reg) return null;
  try {
    const existing = await reg.pushManager.getSubscription();
    if (existing) return existing;
    const subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey),
    });
    return subscription;
  } catch {
    return null;
  }
}

async function sendSubscriptionToServer(subscription) {
  const key = subscription.getKey('p256dh');
  const auth = subscription.getKey('auth');
  const p256dh = btoa(String.fromCharCode(...new Uint8Array(key)));
  const authKey = btoa(String.fromCharCode(...new Uint8Array(auth)));
  await api.post('/api/push/subscribe', {
    endpoint: subscription.endpoint,
    p256dh: p256dh,
    auth: authKey,
  });
}

export function usePushNotification(user) {
  const [permission, setPermission] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );
  const [subscribed, setSubscribed] = useState(false);

  const requestAndSubscribe = useCallback(async () => {
    if (!user) return;
    if (!('Notification' in window) || !('serviceWorker' in navigator)) return;

    let perm = Notification.permission;
    if (perm === 'default') {
      perm = await Notification.requestPermission();
    }
    setPermission(perm);
    if (perm !== 'granted') return;

    const vapidKey = await getVAPIDKey();
    if (!vapidKey) return;

    const subscription = await subscribeToPush(vapidKey);
    if (!subscription) return;

    try {
      await sendSubscriptionToServer(subscription);
      setSubscribed(true);
    } catch {
      // Server may not have VAPID keys configured — silently ignore
    }
  }, [user]);

  useEffect(() => {
    if (user && permission === 'granted') {
      requestAndSubscribe();
    }
  }, [user, permission, requestAndSubscribe]);

  return { permission, subscribed, requestAndSubscribe };
}
