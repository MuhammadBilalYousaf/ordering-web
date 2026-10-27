const publicKey = 'BB5HcsiS8ffOVrIHLPDuQniGf-atxp91aPYdnTq67m0Evl5VKiOVHHLrcfIgWniOM3FJqYsEhEitx14acl7zct0';

function keyBytes(value) {
  const padding = '='.repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((char) => char.charCodeAt(0)));
}

export async function enableOrderAlerts() {
  if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) return null;
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return null;
  const registration = await navigator.serviceWorker.register('/order-sw.js');
  const existing = await registration.pushManager.getSubscription();
  const subscription = existing || await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: keyBytes(publicKey),
  });
  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return null;
  return {
    endpoint: json.endpoint,
    p256dh: json.keys.p256dh,
    auth: json.keys.auth,
  };
}
