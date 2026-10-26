import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBusiness } from '../context/BusinessContext';
import { useCart } from '../context/CartContext';
import { readCustomer, rememberOrder, saveCustomer } from '../services/cache';
import { placeOrder } from '../services/store';
import { money } from '../utils/pricing';

export function CheckoutPage() {
  const { slug, business } = useBusiness();
  const cart = useCart();
  const navigate = useNavigate();
  const saved = readCustomer(slug);
  const [name, setName] = useState(saved.name);
  const [phone, setPhone] = useState(saved.phone);
  const [orderType, setOrderType] = useState('takeaway');
  const [reference, setReference] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function submit(event) {
    event.preventDefault();
    if (!business || cart.lines.length === 0) return;
    if (name.trim().length < 2 || phone.trim().length < 7 || reference.trim().length < 3) {
      setError('Enter your name, phone number, and the payment reference.');
      return;
    }
    setSubmitting(true);
    setError('');
    saveCustomer(slug, { name: name.trim(), phone: phone.trim() });
    try {
      const orderId = await placeOrder({ business, cart, customerName: name, phone, orderType, paymentReference: reference });
      rememberOrder(slug, { id: orderId, orderNumber: 'saved', total: cart.subtotal, createdAt: Date.now() });
      cart.clear();
      navigate(`/b/${slug}/order/${orderId}`);
    } catch (err) {
      console.error(err);
      setError('The order could not be placed. Try again in a moment.');
      setSubmitting(false);
    }
  }

  return (
    <form className="px-4 py-6" onSubmit={submit}>
      <h1 className="text-2xl font-bold">Checkout</h1>
      <p className="text-stone-500">Total {money(cart.subtotal)}. Your name and phone stay on this phone.</p>
      <label className="mt-4 block text-sm font-semibold">Name<input className="mt-1 w-full rounded-2xl border border-stone-200 px-3 py-3" value={name} onChange={(event) => setName(event.target.value)} /></label>
      <label className="mt-3 block text-sm font-semibold">Phone<input className="mt-1 w-full rounded-2xl border border-stone-200 px-3 py-3" value={phone} onChange={(event) => setPhone(event.target.value)} inputMode="tel" /></label>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {['takeaway', 'dineIn'].map((type) => (
          <button key={type} type="button" className={`rounded-2xl border py-3 font-semibold ${orderType === type ? 'border-brand bg-orange-50' : 'border-stone-200 bg-white'}`} onClick={() => setOrderType(type)}>{type === 'dineIn' ? 'Dine-in' : 'Takeaway'}</button>
        ))}
      </div>
      <div className="mt-4 rounded-3xl bg-white p-4">
        <p className="font-semibold">{business?.paymentInstructions || 'Pay first'}</p>
        <p className="mt-2 text-lg font-bold">{business?.paymentAccountNumber}</p>
        <p className="text-sm">{business?.paymentAccountName}</p>
      </div>
      <label className="mt-3 block text-sm font-semibold">Payment reference<input className="mt-1 w-full rounded-2xl border border-stone-200 px-3 py-3" value={reference} onChange={(event) => setReference(event.target.value)} /></label>
      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      <button type="submit" disabled={submitting || cart.lines.length === 0} className="mt-5 w-full rounded-full bg-brand py-4 font-semibold text-white disabled:opacity-60">{submitting ? 'Placing order…' : 'Place order'}</button>
    </form>
  );
}
