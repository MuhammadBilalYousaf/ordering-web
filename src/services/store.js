import { signInAnonymously } from 'firebase/auth';
import { addDoc, collection, doc, onSnapshot, query, serverTimestamp, where } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { saveProfile } from './auth';

export function watchBusiness(slug, onData, onError) {
  return onSnapshot(
    doc(db, 'publicBusinesses', slug),
    (snap) => {
      if (!snap.exists() || snap.data().status !== 'active') onData(null);
      else onData({ slug: snap.id, ...snap.data() });
    },
    () => onError('This restaurant page is unavailable right now.'),
  );
}

export function watchMenu(businessId, onData, onError) {
  if (!businessId) return () => {};
  return onSnapshot(
    doc(db, 'publicMenus', businessId),
    (snap) => onData(snap.exists() ? snap.data() : { categories: [] }),
    () => onError('The menu could not be loaded.'),
  );
}

export function watchOrder(orderId, onData, onError) {
  return onSnapshot(
    doc(db, 'customerOrders', orderId),
    (snap) => onData(snap.exists() ? { id: snap.id, ...snap.data() } : null),
    () => onError('This order could not be loaded.'),
  );
}

export function watchMyOrders(uid, onData, onError) {
  if (!uid) return () => {};
  const orders = query(collection(db, 'customerOrders'), where('customerUid', '==', uid));
  return onSnapshot(orders, (snap) => {
    onData(snap.docs.map((item) => ({ id: item.id, ...item.data() })));
  }, () => onError('Your orders could not be loaded.'));
}

export async function placeOrder({ business, cart, customerName, phone, orderType, paymentReference }) {
  const credential = auth.currentUser ? { user: auth.currentUser } : await signInAnonymously(auth);
  const user = credential.user;
  try {
    await saveProfile(user, { name: customerName, phone });
  } catch (error) {
    console.error(error);
  }
  const items = cart.lines.map((line) => ({
    productId: line.productId,
    name: line.name,
    variantId: line.variantId || null,
    variantName: line.variantName || null,
    addons: line.addons,
    quantity: line.quantity,
    unitPrice: line.unitPrice,
    lineTotal: line.unitPrice * line.quantity,
  }));
  const total = cart.subtotal;
  const ref = await addDoc(collection(db, 'customerOrders'), {
    businessId: business.businessId,
    branchId: business.branchId || null,
    customerUid: user.uid,
    customerName: customerName.trim(),
    phone: phone.trim(),
    customerEmail: user.email || '',
    customerKind: user.isAnonymous ? 'guest' : 'account',
    orderType,
    items,
    subtotal: total,
    total,
    paymentMethod: 'manual',
    paymentReference: paymentReference.trim(),
    paymentStatus: 'PENDING_PAYMENT_VERIFICATION',
    orderStatus: 'PENDING_PAYMENT_VERIFICATION',
    orderNumber: String(Date.now()).slice(-6),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}
