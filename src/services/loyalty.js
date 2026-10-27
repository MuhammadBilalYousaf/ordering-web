import { collection, doc, getDoc, getDocs, limit, onSnapshot, orderBy, query, runTransaction, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import { db } from '../firebase/config';
import { loyaltyConfig, pointsForSpend } from './loyaltyMath';

export function loyaltyAccountId(businessId, customerId) {
  return `${businessId}_${customerId}`;
}

export function watchLoyalty(businessId, customerId, onData) {
  if (!businessId || !customerId) return () => {};
  return onSnapshot(doc(db, 'loyaltyAccounts', loyaltyAccountId(businessId, customerId)), (snap) => {
    onData(snap.exists() ? snap.data() : { pointsBalance: 0, lifetimePoints: 0 });
  }, () => onData({ pointsBalance: 0, lifetimePoints: 0 }));
}

export function watchLoyaltyActivity(businessId, customerId, onData) {
  if (!businessId || !customerId) return () => {};
  const rows = query(collection(db, 'loyaltyAccounts', loyaltyAccountId(businessId, customerId), 'transactions'), orderBy('createdAt', 'desc'), limit(8));
  return onSnapshot(rows, (snap) => {
    onData(snap.docs.map((item) => ({ id: item.id, ...item.data() })));
  }, () => onData([]));
}

function accountRef(businessId, customerId) {
  return doc(db, 'loyaltyAccounts', loyaltyAccountId(businessId, customerId));
}

function txnRef(businessId, customerId, txnId) {
  return doc(db, 'loyaltyAccounts', loyaltyAccountId(businessId, customerId), 'transactions', txnId);
}

function applyBalance(account, points, type) {
  const balance = Math.max(0, (Number(account?.pointsBalance) || 0) + points);
  const lifetime = type === 'EARN'
    ? (Number(account?.lifetimePoints) || 0) + points
    : (Number(account?.lifetimePoints) || 0);
  return { pointsBalance: balance, lifetimePoints: lifetime };
}

async function applyTransaction({ businessId, customerId, txnId, type, points, orderId, orderNumber, description }) {
  const ref = txnRef(businessId, customerId, txnId);
  const account = accountRef(businessId, customerId);
  if ((await getDoc(ref)).exists()) return;
  const created = await runTransaction(db, async (tx) => {
    if ((await tx.get(ref)).exists()) return false;
    tx.set(ref, {
      customerId,
      businessId,
      orderId,
      orderNumber: orderNumber || '',
      type,
      points,
      description,
      createdAt: serverTimestamp(),
    });
    return true;
  });
  if (!created) return;
  await runTransaction(db, async (tx) => {
    const accountSnap = await tx.get(account);
    const current = accountSnap.exists() ? accountSnap.data() : null;
    const applied = current?.applied || {};
    if (applied[txnId] === true) return;
    const next = applyBalance(current, points, type);
    tx.set(account, {
      customerId,
      businessId,
      pointsBalance: next.pointsBalance,
      lifetimePoints: next.lifetimePoints,
      lastAppliedId: txnId,
      applied: { ...applied, [txnId]: true },
    }, { merge: true });
  });
}

export function watchOrderEarn(businessId, customerId, orderId, onPoints) {
  if (!businessId || !customerId || !orderId) return () => {};
  return onSnapshot(txnRef(businessId, customerId, `${orderId}_EARN`), (snap) => {
    onPoints(snap.exists() ? Number(snap.data().points) || 0 : 0);
  }, () => onPoints(0));
}

export async function redeemPoints({ businessId, customerId, orderId, orderNumber, points }) {
  const count = Math.floor(Number(points) || 0);
  if (count <= 0) return;
  const account = await getDoc(accountRef(businessId, customerId));
  const balance = account.exists() ? Number(account.data().pointsBalance) || 0 : 0;
  if (count > balance) throw new Error('Not enough loyalty points.');
  await applyTransaction({
    businessId,
    customerId,
    txnId: `${orderId}_REDEEM`,
    type: 'REDEEM',
    points: -count,
    orderId,
    orderNumber,
    description: `Redeemed on order ${orderNumber || orderId}`,
  });
}

export async function awardCompletedOrders(businessId, customerId) {
  if (!businessId || !customerId) return;
  const rows = query(collection(db, 'customerOrders'), where('customerUid', '==', customerId));
  const snap = await getDocs(rows);
  for (const item of snap.docs) {
    const order = { id: item.id, ...item.data() };
    if (order.businessId === businessId && order.orderStatus === 'COMPLETED') {
      await syncOrderLoyalty(order);
    }
  }
}

export async function syncOrderLoyalty(order) {
  if (!order?.id || order.customerKind === 'guest' || !order.customerUid || !order.businessId) return;
  const { id, businessId, customerUid, orderNumber, orderStatus } = order;
  const earned = pointsForSpend(Number(order.total) || 0);
  const redeemed = Math.floor(Number(order.pointsRedeemed) || 0);
  if (orderStatus === 'COMPLETED' && earned > 0) {
    await applyTransaction({
      businessId,
      customerId: customerUid,
      txnId: `${id}_EARN`,
      type: 'EARN',
      points: earned,
      orderId: id,
      orderNumber,
      description: `Earned on order ${orderNumber || id}`,
    });
    await updateDoc(doc(db, 'customerOrders', id), { loyaltyPointsEarned: earned }).catch(() => {});
  }
  if (orderStatus !== 'CANCELLED' && orderStatus !== 'PAYMENT_REJECTED') return;
  const earn = await getDoc(txnRef(businessId, customerUid, `${id}_EARN`));
  if (earn.exists()) {
    await applyTransaction({
      businessId,
      customerId: customerUid,
      txnId: `${id}_EARN_REVERSAL`,
      type: 'REVERSAL',
      points: -Math.abs(Number(earn.data().points) || 0),
      orderId: id,
      orderNumber,
      description: `Reversed earn for order ${orderNumber || id}`,
    });
  }
  if (redeemed > 0) {
    await applyTransaction({
      businessId,
      customerId: customerUid,
      txnId: `${id}_REDEEM_REVERSAL`,
      type: 'REVERSAL',
      points: redeemed,
      orderId: id,
      orderNumber,
      description: `Returned points for order ${orderNumber || id}`,
    });
  }
}

export { loyaltyConfig };
