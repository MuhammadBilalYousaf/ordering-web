import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useBusiness } from '../context/BusinessContext';
import { isGuest, watchAuth } from '../services/auth';
import { readCustomer, updateSavedOrder } from '../services/cache';
import { syncOrderLoyalty, watchOrderEarn } from '../services/loyalty';
import { watchMyOrders, watchOrder } from '../services/store';
import { money } from '../utils/pricing';
import { statusLabels, steps } from '../utils/status';

export function OrdersPage() {
  const { slug } = useBusiness();
  const [user, setUser] = useState(undefined);
  const [cloud, setCloud] = useState([]);
  useEffect(() => watchAuth(setUser), []);
  const signedIn = Boolean(user && !isGuest(user) && user.email);
  useEffect(() => {
    if (!signedIn) {
      setCloud([]);
      return undefined;
    }
    return watchMyOrders(user.uid, user.email, (next) => {
      setCloud((current) => {
        const slim = next.map((order) => ({
          id: order.id,
          orderNumber: order.orderNumber,
          total: order.total,
          customerEmail: order.customerEmail,
          orderStatus: order.orderStatus || '',
          paymentStatus: order.paymentStatus || '',
          items: (order.items || []).map((item) => ({ productId: item.productId, name: item.name, imageUrl: item.imageUrl || '', quantity: item.quantity })),
        }));
        if (current.length === slim.length && current.every((item, index) => item.id === slim[index].id && item.orderStatus === slim[index].orderStatus && item.paymentStatus === slim[index].paymentStatus && item.total === slim[index].total && (item.items || []).length === (slim[index].items || []).length)) {
          return current;
        }
        return slim;
      });
    }, () => {});
  }, [signedIn, user]);
  if (user === undefined) return <p className="p-8 text-center">Loading orders…</p>;
  const saved = readCustomer(slug, signedIn ? user : null);
  const email = signedIn ? user.email.trim().toLowerCase() : '';
  const localOrders = signedIn
    ? saved.orders.filter((order) => !order.customerEmail || String(order.customerEmail).toLowerCase() === email)
    : saved.orders;
  const byId = new Map(signedIn ? [] : localOrders.map((order) => [order.id, order]));
  if (signedIn) {
    cloud.forEach((order) => byId.set(order.id, order));
    localOrders.forEach((order) => {
      if (!byId.has(order.id)) byId.set(order.id, order);
    });
  }
  const orders = [...byId.values()];
  if (orders.length === 0) {
    return (
      <div className="px-5 py-8">
        <h1 className="text-2xl font-bold">Orders</h1>
        <p className="mt-3 text-stone-500">Guest orders stay on this phone. An account keeps them after you change phones.</p>
        <Link to={`/b/${slug}/account`} className="mt-4 inline-block font-semibold text-brand">Sign in or create an account</Link>
      </div>
    );
  }
  return (
    <div className="px-4 py-6">
      <h1 className="text-2xl font-bold">Orders</h1>
      <Link to={`/b/${slug}/track`} className="text-sm font-semibold text-brand">Track by number</Link>
      <div className="mt-4 grid gap-3">
        {orders.map((order) => <OrderRow key={order.id} slug={slug} order={order} />)}
      </div>
    </div>
  );
}

function productImage(menu, productId, fallback) {
  if (fallback) return fallback;
  for (const category of menu?.categories || []) {
    const product = (category.products || []).find((item) => item.id === productId);
    if (product?.imageUrl) return product.imageUrl;
  }
  return '';
}

function OrderRow({ slug, order }) {
  const { menu } = useBusiness();
  const [user, setUser] = useState(undefined);
  const [items, setItems] = useState(order.items || []);
  const preview = items.slice(0, 3);
  const [status, setStatus] = useState(order.orderStatus || '');
  const statusRef = useRef(status);
  statusRef.current = status;
  useEffect(() => watchAuth(setUser), []);
  useEffect(() => {
    if (order.orderStatus && order.orderStatus !== statusRef.current) setStatus(order.orderStatus);
  }, [order.orderStatus]);
  useEffect(() => {
    if (!user || !order.id) return undefined;
    return watchOrder(order.id, (value) => {
      if (!value) return;
      if (value.items?.length) setItems(value.items);
      if (!value.orderStatus || value.orderStatus === statusRef.current) return;
      setStatus(value.orderStatus);
      updateSavedOrder(slug, user.isAnonymous ? null : user, order.id, {
        orderStatus: value.orderStatus,
        paymentStatus: value.paymentStatus,
      });
    }, () => {});
  }, [order.id, slug, user]);
  return (
    <Link to={`/b/${slug}/order/${order.id}`} className="card-pop block overflow-hidden rounded-3xl bg-white shadow-md shadow-stone-300/60 transition hover:-translate-y-0.5 hover:shadow-lg">
      {preview.length > 0 ? (
        <div className="flex h-24">
          {preview.map((item, index) => {
            const src = productImage(menu, item.productId, item.imageUrl);
            return (
              <div key={`${item.name}-${index}`} className="thumb-in relative flex-1 overflow-hidden bg-orange-50" style={{ animationDelay: `${index * 60}ms` }}>
                {src ? <img src={src} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-2xl">🍽️</div>}
              </div>
            );
          })}
        </div>
      ) : null}
      <div className="p-4">
        <div className="flex justify-between gap-3">
          <p className="font-bold">Order {order.orderNumber || '…'}</p>
          <p className="font-bold">{money(order.total)}</p>
        </div>
        <p className="status-line mt-1 text-sm text-stone-500">{statusLabels[status] || 'Waiting for update'}</p>
      </div>
    </Link>
  );
}

export function TrackPage() {
  const { slug } = useBusiness();
  const [query, setQuery] = useState('');
  const [user, setUser] = useState(null);
  useEffect(() => watchAuth(setUser), []);
  const saved = readCustomer(slug, user && !isGuest(user) ? user : null);
  const match = saved.orders.find((order) => order.orderNumber === query.trim() || order.id === query.trim());
  return (
    <div className="px-4 py-6">
      <h1 className="text-2xl font-bold">Track order</h1>
      <p className="mt-1 text-sm text-stone-500">Use the order number from this phone.</p>
      <input className="mt-4 w-full rounded-2xl border border-stone-200 px-3 py-3" placeholder="Order number" value={query} onChange={(event) => setQuery(event.target.value)} />
      {match ? <Link to={`/b/${slug}/order/${match.id}`} className="mt-4 block rounded-full bg-brand py-3 text-center font-semibold text-white">Open order {match.orderNumber}</Link> : null}
      {query && !match ? <p className="mt-3 text-sm text-stone-500">No saved order uses that number on this phone.</p> : null}
    </div>
  );
}

function savedOrder(slug, orderId, user) {
  const buckets = [readCustomer(slug, null), readCustomer(slug, user && !isGuest(user) ? user : null)];
  for (const bucket of buckets) {
    const match = bucket.orders.find((order) => order.id === orderId);
    if (match) return match;
  }
  return null;
}

export function OrderPage() {
  const { slug, menu } = useBusiness();
  const { orderId } = useParams();
  const [user, setUser] = useState(undefined);
  const [order, setOrder] = useState(undefined);
  const [earnedPoints, setEarnedPoints] = useState(0);
  const [error, setError] = useState('');
  useEffect(() => watchAuth(setUser), []);
  useEffect(() => {
    const cached = savedOrder(slug, orderId, user);
    if (cached) setOrder((current) => current || cached);
  }, [slug, orderId, user]);
  useEffect(() => {
    if (user === undefined || !orderId) return undefined;
    if (!user) {
      setOrder((current) => current || savedOrder(slug, orderId, null));
      return undefined;
    }
    return watchOrder(orderId, (value) => {
      setError('');
      if (!value) {
        setOrder((current) => current || null);
        return;
      }
      setOrder((previous) => {
        const next = { ...(previous || {}), ...value };
        if (value.orderStatus === 'COMPLETED' || value.orderStatus === 'CANCELLED' || value.orderStatus === 'PAYMENT_REJECTED') {
          syncOrderLoyalty(value).catch(() => {});
        }
        if (previous?.orderStatus !== value.orderStatus || previous?.paymentStatus !== value.paymentStatus) {
          updateSavedOrder(slug, user.isAnonymous ? null : user, orderId, {
            orderStatus: value.orderStatus,
            paymentStatus: value.paymentStatus,
            orderNumber: value.orderNumber,
            items: value.items,
            total: value.total,
          });
        }
        return next;
      });
    }, () => {
      setOrder((current) => {
        if (current) return current;
        setError('This order could not be loaded.');
        return current;
      });
    });
  }, [orderId, user, slug]);
  useEffect(() => {
    if (!order?.businessId || !order?.customerUid || !order?.id) return undefined;
    return watchOrderEarn(order.businessId, order.customerUid, order.id, setEarnedPoints);
  }, [order?.businessId, order?.customerUid, order?.id]);
  if (!order && user === undefined) return <p className="p-8 text-center">Loading your order…</p>;
  if (!order) return <p className="p-6">{error || 'Order not found on this phone.'}</p>;
  const active = steps.indexOf(order.orderStatus);
  return (
    <div className="px-4 py-6">
      <p className="text-sm font-semibold text-brand">Order {order.orderNumber}</p>
      <h1 key={order.orderStatus} className="status-line mt-1 text-2xl font-bold">{statusLabels[order.orderStatus] || 'Order update'}</h1>
      <div className="mt-4 grid gap-2">
        {steps.map((step, index) => (
          <div key={step} style={{ animationDelay: `${index * 40}ms` }} className={`card-pop rounded-2xl px-3 py-2 text-sm transition ${index === active ? 'scale-[1.02] bg-brand font-semibold text-white shadow-md' : index < active ? 'bg-orange-50 font-semibold text-brand' : 'bg-white text-stone-400'}`}>{statusLabels[step]}</div>
        ))}
      </div>
      <div className="mt-4 grid gap-3">
        {(order.items || []).map((item, index) => {
          const src = productImage(menu, item.productId, item.imageUrl);
          return (
            <div key={`${item.productId || item.name}-${index}`} style={{ animationDelay: `${index * 50}ms` }} className="card-pop flex gap-3 rounded-3xl bg-white p-3 shadow-md shadow-stone-300/60">
              <div className="thumb-in h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-orange-50">
                {src ? <img src={src} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-xl">🍽️</div>}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-bold leading-snug">{item.quantity} × {item.name}</p>
                <p className="text-sm text-stone-500">{[item.variantName, ...(item.addons || []).map((addon) => addon.name)].filter(Boolean).join(' · ')}</p>
              </div>
              <p className="shrink-0 font-bold">{money(item.lineTotal || (item.unitPrice || 0) * (item.quantity || 1))}</p>
            </div>
          );
        })}
      </div>
      {order.orderType === 'dineIn' ? (
        <p className="mt-4 text-sm text-stone-600">{order.dineInPickup ? 'When it is ready, collect it from the shop and give this order number.' : `We will bring it to: ${order.seatingNote || 'your seat'}`}</p>
      ) : null}
      <p className="mt-4 text-sm text-stone-500">Payment: {statusLabels[order.paymentStatus] || order.paymentStatus}</p>
      <p className="mt-2 text-right text-lg font-bold">{money(order.total)}</p>
      {order.loyaltyDiscount > 0 ? <p className="text-right text-sm text-brand">Loyalty discount -{money(order.loyaltyDiscount)} ({order.pointsRedeemed} points)</p> : null}
      {earnedPoints > 0 ? <p className="text-right text-sm text-green-700">Loyalty earned +{earnedPoints} points</p> : null}
      <Link to={`/b/${slug}/orders`} className="mt-4 block text-center font-semibold text-brand">All orders</Link>
    </div>
  );
}
