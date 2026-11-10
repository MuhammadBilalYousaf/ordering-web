import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useBusiness } from '../context/BusinessContext';
import { useCart } from '../context/CartContext';
import { isGuest, watchAuth } from '../services/auth';
import { readCustomer, updateSavedOrder } from '../services/cache';
import { syncOrderLoyalty, watchOrderEarn } from '../services/loyalty';
import { watchMyOrders, watchOrder } from '../services/store';
import { PageSkeleton } from '../components/Skeleton';
import { saveOrderFeedback, watchOrderFeedback } from '../services/feedback';
import { planReorder } from '../services/reorder';
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
  if (user === undefined) return <PageSkeleton />;
  const saved = readCustomer(slug, signedIn ? user : null);
  const email = signedIn ? user.email.trim().toLowerCase() : '';
  const localOrders = signedIn
    ? saved.orders.filter((order) => order.customerKind !== 'guest' && String(order.customerEmail || '').toLowerCase() === email)
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
  const cart = useCart();
  const navigate = useNavigate();
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
  if (!order && user === undefined) return <PageSkeleton cards={4} />;
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
      {order.orderNotes ? <p className="mt-4 text-sm text-stone-600">Your notes: {order.orderNotes}</p> : null}
      <StaffNotes comments={order.staffComments} />
      <p className="mt-4 text-sm text-stone-500">Payment: {statusLabels[order.paymentStatus] || order.paymentStatus}</p>
      {order.paymentReference ? <p className="mt-1 text-sm text-stone-500">Reference: {order.paymentReference}</p> : null}
      <p className="mt-2 text-right text-lg font-bold">{money(order.total)}</p>
      {order.loyaltyDiscount > 0 ? <p className="text-right text-sm text-brand">Loyalty discount -{money(order.loyaltyDiscount)} ({order.pointsRedeemed} points)</p> : null}
      {earnedPoints > 0 ? <p className="text-right text-sm text-green-700">Loyalty earned +{earnedPoints} points</p> : null}
      <button type="button" className="mt-4 w-full rounded-full bg-ink py-3 font-semibold text-white transition active:scale-[0.98]" onClick={() => {
        const plan = planReorder(menu, order.items);
        plan.lines.forEach((line) => cart.addLine(line));
        const detail = [...plan.notes, ...plan.skipped.map((item) => `${item.name}: ${item.reason}`)].join('\n');
        if (plan.lines.length === 0) {
          window.alert(detail || 'Nothing from this order is on the menu now.');
          return;
        }
        if (detail) window.alert(detail);
        navigate(`/b/${slug}/cart`);
      }}>Reorder</button>
      <OrderFeedback order={order} user={user} />
      <Link to={`/b/${slug}/orders`} className="mt-4 block text-center font-semibold text-brand">All orders</Link>
    </div>
  );
}

function OrderFeedback({ order, user }) {
  const [existing, setExisting] = useState(undefined);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => watchOrderFeedback(order.id, (value) => {
    setExisting(value);
    if (value && !editing) {
      setRating(value.rating || 0);
      setComment(value.comment || '');
    }
  }), [order.id, editing]);
  if (order.orderStatus !== 'COMPLETED') return null;
  if (user === undefined || existing === undefined) return <PageSkeleton cards={1} />;
  const signedIn = user && !isGuest(user);
  if (!signedIn) {
    return <p className="mt-4 text-sm text-stone-500">Sign in with the account that placed this order to leave feedback.</p>;
  }
  if (existing && !editing) {
    return (
      <div className="mt-4 rounded-3xl bg-white p-4 shadow-sm">
        <p className="font-semibold">Your feedback</p>
        <p className="mt-1 text-sm text-brand">{'★'.repeat(existing.rating || 0)}{'☆'.repeat(Math.max(0, 5 - (existing.rating || 0)))}</p>
        {existing.comment ? <p className="mt-2 text-sm">{existing.comment}</p> : null}
        <p className="mt-2 text-xs text-stone-500">{existing.status === 'reviewed' ? 'Reviewed by the shop' : 'Sent to the shop'}</p>
        <button type="button" className="mt-3 text-sm font-semibold text-brand" onClick={() => setEditing(true)}>Edit feedback</button>
      </div>
    );
  }
  return (
    <form className="mt-4 rounded-3xl bg-white p-4 shadow-sm" onSubmit={async (event) => {
      event.preventDefault();
      setBusy(true);
      setMessage('');
      try {
        await saveOrderFeedback({ order, user, rating, comment, existing });
        setEditing(false);
        setMessage(existing ? 'Feedback updated.' : 'Feedback sent.');
      } catch (error) {
        setMessage(error.message || 'Feedback could not be saved.');
      } finally {
        setBusy(false);
      }
    }}>
      <p className="font-semibold">{existing ? 'Edit feedback' : 'How was this order?'}</p>
      <div className="mt-2 flex gap-2">
        {[1, 2, 3, 4, 5].map((score) => (
          <button key={score} type="button" className={`h-10 w-10 rounded-full text-sm font-bold transition ${rating === score ? 'bg-brand text-white' : 'bg-stone-100'}`} onClick={() => setRating(score)}>{score}</button>
        ))}
      </div>
      <textarea className="mt-3 w-full rounded-2xl border border-stone-200 px-3 py-3 text-sm" rows={3} maxLength={500} value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Optional comment for this order" />
      {message ? <p className="mt-2 text-sm text-stone-600">{message}</p> : null}
      <button disabled={busy} className="mt-3 w-full rounded-full bg-brand py-3 font-semibold text-white disabled:opacity-60">{busy ? 'Saving…' : existing ? 'Update feedback' : 'Send feedback'}</button>
    </form>
  );
}

function StaffNotes({ comments }) {
  const list = (Array.isArray(comments) ? comments : [])
    .map((item) => ({
      id: item?.id || `${item?.createdAt || ''}-${item?.text || ''}`,
      text: String(item?.text || '').trim(),
      authorName: String(item?.authorName || 'Staff').trim() || 'Staff',
      createdAt: item?.createdAt,
    }))
    .filter((item) => item.text)
    .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
  if (list.length === 0) return null;
  return (
    <div className="mt-4 rounded-3xl bg-white p-4 shadow-md shadow-stone-300/40">
      <p className="font-semibold">Notes from the shop</p>
      <p className="mt-1 text-sm text-stone-500">Updates passed by staff for this order.</p>
      <div className="mt-3 grid gap-2">
        {list.map((item) => (
          <div key={item.id} className="rounded-2xl bg-orange-50 px-3 py-3">
            <p className="text-sm font-medium text-stone-800">{item.text}</p>
            <p className="mt-1 text-xs text-stone-500">{item.authorName}{item.createdAt ? ` · ${formatStaffNoteTime(item.createdAt)}` : ''}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatStaffNoteTime(value) {
  const date = value?.toDate ? value.toDate() : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}
