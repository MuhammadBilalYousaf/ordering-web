import { collection, doc, onSnapshot, query, serverTimestamp, setDoc, where } from 'firebase/firestore';
import { db } from '../firebase/config';

export function watchPublicFeedback(businessId, onData) {
  if (!businessId) return () => {};
  const published = query(
    collection(db, 'orderFeedback'),
    where('businessId', '==', businessId),
    where('status', '==', 'reviewed'),
  );
  return onSnapshot(published, (snap) => {
    onData(snap.docs.map((item) => ({ id: item.id, ...item.data() })));
  }, () => onData([]));
}

export function watchOrderFeedback(orderId, onData) {
  if (!orderId) return () => {};
  return onSnapshot(doc(db, 'orderFeedback', orderId), (snap) => {
    onData(snap.exists() ? { id: snap.id, ...snap.data() } : null);
  }, () => onData(null));
}

export async function saveOrderFeedback({ order, user, rating, comment, existing }) {
  const text = String(comment || '').trim();
  const score = Math.round(Number(rating));
  if (!order?.id || !user || user.isAnonymous) throw new Error('Sign in to leave feedback on this order.');
  if (order.orderStatus !== 'COMPLETED') throw new Error('Feedback opens after the order is completed.');
  if (score < 1 || score > 5) throw new Error('Choose a rating from 1 to 5.');
  if (text.length > 500) throw new Error('Keep the comment under 500 characters.');
  const payload = {
    orderId: order.id,
    orderNumber: order.orderNumber || '',
    businessId: order.businessId,
    customerUid: user.uid,
    customerName: order.customerName || user.displayName || '',
    rating: score,
    comment: text,
    updatedAt: serverTimestamp(),
  };
  if (!existing) {
    payload.status = 'new';
    payload.createdAt = serverTimestamp();
  }
  await setDoc(doc(db, 'orderFeedback', order.id), payload, { merge: true });
}
