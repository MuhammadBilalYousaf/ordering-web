import { signInAnonymously } from 'firebase/auth';
import { collection, doc, getDoc, onSnapshot, query, runTransaction, serverTimestamp, setDoc, where } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { saveProfile } from './auth';
import { discountForPoints } from './loyaltyMath';

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

export function watchMyOrders(uid, email, onData, onError) {
  const needle = String(email || '').trim().toLowerCase();
  if (!uid || !needle) return () => {};
  const orders = query(collection(db, 'customerOrders'), where('customerUid', '==', uid));
  return onSnapshot(orders, (snap) => {
    onData(snap.docs
      .map((item) => ({ id: item.id, ...item.data() }))
      .filter((order) => String(order.customerEmail || '').trim().toLowerCase() === needle));
  }, () => onError('Your orders could not be loaded.'));
}

export async function placeOrder({ business, cart, customerName, phone, orderType, paymentReference, seatingNote = '', dineInPickup = false, slug = '', notify = null, pointsRedeemed = 0 }) {
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
    imageUrl: line.imageUrl || '',
    variantId: line.variantId || null,
    variantName: line.variantName || null,
    addons: line.addons,
    quantity: line.quantity,
    unitPrice: line.unitPrice,
    lineTotal: line.unitPrice * line.quantity,
  }));
  const subtotal = cart.subtotal;
  const redeemed = user.isAnonymous ? 0 : Math.max(0, Math.floor(Number(pointsRedeemed) || 0));
  const loyaltyDiscount = discountForPoints(redeemed);
  const total = subtotal - loyaltyDiscount;
  if (total < 0) throw new Error('Loyalty discount cannot be more than the order.');
  const orderNumber = String(Date.now()).slice(-6);
  const order = {
    businessId: business.businessId,
    branchId: business.branchId || null,
    customerUid: user.uid,
    customerName: customerName.trim(),
    phone: phone.trim(),
    customerEmail: (user.email || '').trim().toLowerCase(),
    customerKind: user.isAnonymous ? 'guest' : 'account',
    orderType,
    seatingNote: orderType === 'dineIn' && !dineInPickup ? String(seatingNote || '').trim() : '',
    dineInPickup: orderType === 'dineIn' && dineInPickup,
    items,
    subtotal,
    loyaltyDiscount,
    pointsRedeemed: redeemed,
    loyaltyPointsEarned: 0,
    total,
    paymentMethod: 'manual',
    paymentReference: paymentReference.trim(),
    paymentStatus: 'PENDING_PAYMENT_VERIFICATION',
    orderStatus: 'PENDING_PAYMENT_VERIFICATION',
    orderNumber,
    slug: slug || business.slug || '',
    notifyEndpoint: notify?.endpoint || '',
    notifyP256dh: notify?.p256dh || '',
    notifyAuth: notify?.auth || '',
  };
  const ref = doc(collection(db, 'customerOrders'));
  if (redeemed > 0) {
    const accountRef = doc(db, 'loyaltyAccounts', `${business.businessId}_${user.uid}`);
    const txnId = `${ref.id}_REDEEM`;
    const txn = doc(db, 'loyaltyAccounts', `${business.businessId}_${user.uid}`, 'transactions', txnId);
    const current = await getDoc(accountRef);
    const balance = current.exists() ? Number(current.data().pointsBalance) || 0 : 0;
    if (redeemed > balance) throw new Error('Not enough loyalty points.');
    await setDoc(txn, {
      customerId: user.uid,
      businessId: business.businessId,
      orderId: ref.id,
      orderNumber,
      type: 'REDEEM',
      points: -redeemed,
      description: `Redeemed on order ${orderNumber}`,
      createdAt: serverTimestamp(),
    });
    await runTransaction(db, async (tx) => {
      const account = await tx.get(accountRef);
      const latest = account.exists() ? Number(account.data().pointsBalance) || 0 : 0;
      if (redeemed > latest) throw new Error('Not enough loyalty points.');
      const lifetime = account.exists() ? Number(account.data().lifetimePoints) || 0 : 0;
      const applied = { ...(account.exists() ? account.data().applied || {} : {}), [txnId]: true };
      tx.set(accountRef, {
        customerId: user.uid,
        businessId: business.businessId,
        pointsBalance: latest - redeemed,
        lifetimePoints: lifetime,
        lastAppliedId: txnId,
        applied,
      }, { merge: true });
    });
    await setDoc(ref, { ...order, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  } else {
    await setDoc(ref, { ...order, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  }
  return { id: ref.id, ...order };
}
