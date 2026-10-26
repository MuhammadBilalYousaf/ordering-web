import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useBusiness } from '../context/BusinessContext';
import { readCustomer, saveCustomer } from '../services/cache';
import { watchOrder } from '../services/store';
import { money } from '../utils/pricing';
import { statusLabels, steps } from '../utils/status';

export function OrdersPage() {
  const { slug } = useBusiness();
  const saved = readCustomer(slug);
  if (saved.orders.length === 0) {
    return (
      <div className="px-5 py-8">
        <h1 className="text-2xl font-bold">Orders</h1>
        <p className="mt-3 text-stone-500">Orders you place on this phone are kept here.</p>
      </div>
    );
  }
  return (
    <div className="px-4 py-6">
      <h1 className="text-2xl font-bold">Orders</h1>
      <div className="mt-4 grid gap-3">
        {saved.orders.map((order) => <OrderRow key={order.id} slug={slug} order={order} />)}
      </div>
    </div>
  );
}

function OrderRow({ slug, order }) {
  const [live, setLive] = useState(null);
  useEffect(() => watchOrder(order.id, (value) => {
    setLive(value);
    if (value?.orderNumber) {
      const saved = readCustomer(slug);
      saveCustomer(slug, {
        orders: saved.orders.map((item) => item.id === order.id ? { ...item, orderNumber: value.orderNumber, total: value.total } : item),
      });
    }
  }, () => {}), [order.id, slug]);
  const status = live?.orderStatus;
  return (
    <Link to={`/b/${slug}/order/${order.id}`} className="block rounded-3xl bg-white p-4 shadow-sm">
      <div className="flex justify-between">
        <p className="font-semibold">Order {live?.orderNumber || order.orderNumber || '…'}</p>
        <p>{money(live?.total ?? order.total)}</p>
      </div>
      <p className="mt-1 text-sm text-stone-500">{statusLabels[status] || 'Opening…'}</p>
    </Link>
  );
}

export function TrackPage() {
  const { slug } = useBusiness();
  const [query, setQuery] = useState('');
  const saved = readCustomer(slug);
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

export function OrderPage() {
  const { slug } = useBusiness();
  const { orderId } = useParams();
  const [order, setOrder] = useState(undefined);
  const [error, setError] = useState('');
  useEffect(() => watchOrder(orderId, setOrder, setError), [orderId]);
  if (error) return <p className="p-6">{error}</p>;
  if (!order) return <p className="p-8 text-center">{order === undefined ? 'Loading your order…' : 'Order not found on this phone.'}</p>;
  const active = steps.indexOf(order.orderStatus);
  return (
    <div className="px-4 py-6">
      <p className="text-sm font-semibold text-brand">Order {order.orderNumber}</p>
      <h1 className="mt-1 text-2xl font-bold">{statusLabels[order.orderStatus] || 'Order update'}</h1>
      <div className="mt-4 grid gap-2">
        {steps.map((step, index) => (
          <div key={step} className={`rounded-2xl px-3 py-2 text-sm ${index <= active ? 'bg-orange-50 font-semibold text-brand' : 'bg-white text-stone-400'}`}>{statusLabels[step]}</div>
        ))}
      </div>
      <p className="mt-4 text-sm text-stone-500">Payment: {statusLabels[order.paymentStatus] || order.paymentStatus}</p>
      <p className="mt-2 text-right text-lg font-bold">{money(order.total)}</p>
      <Link to={`/b/${slug}/orders`} className="mt-4 block text-center font-semibold text-brand">All orders</Link>
    </div>
  );
}
