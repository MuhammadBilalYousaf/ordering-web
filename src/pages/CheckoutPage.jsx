import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBusiness } from '../context/BusinessContext';
import { useCart } from '../context/CartContext';
import { isGuest, watchAuth } from '../services/auth';
import { readCustomer, rememberOrder, saveCustomer } from '../services/cache';
import { watchLoyalty } from '../services/loyalty';
import { discountForPoints, maxRedeemablePoints } from '../services/loyaltyMath';
import { enableOrderAlerts } from '../services/notify';
import { PaymentDetails } from '../components/PaymentDetails';
import { compressPaymentProof, extractPaymentReference } from '../services/paymentProof';
import { cashOnDeliveryEnabled, checkoutPaymentError, phoneDigits } from '../services/paymentChoice';
import { placeOrder } from '../services/store';
import { money } from '../utils/pricing';

export function CheckoutPage() {
  const { slug, business } = useBusiness();
  const cart = useCart();
  const navigate = useNavigate();
  const [user, setUser] = useState(undefined);
  useEffect(() => watchAuth(setUser), []);
  const identity = user && !isGuest(user) ? user : null;
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  useEffect(() => {
    if (user === undefined) return;
    const cached = readCustomer(slug, identity);
    setName(cached.name);
    setPhone(phoneDigits(cached.phone));
  }, [user, slug]);
  const [orderType, setOrderType] = useState('takeaway');
  const [payMethod, setPayMethod] = useState('prepaid');
  const [serveAtTable, setServeAtTable] = useState(true);
  const [seatingNote, setSeatingNote] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [reference, setReference] = useState('');
  const [proofPreview, setProofPreview] = useState('');
  const [proofDataUrl, setProofDataUrl] = useState('');
  const [scanning, setScanning] = useState(false);
  const [balance, setBalance] = useState(0);
  const [redeemInput, setRedeemInput] = useState(0);
  useEffect(() => {
    if (!identity || !business?.businessId) {
      setBalance(0);
      return undefined;
    }
    return watchLoyalty(business.businessId, identity.uid, (account) => setBalance(Math.floor(Number(account.pointsBalance) || 0)));
  }, [identity, business]);
  const redeemCap = maxRedeemablePoints(balance, cart.subtotal);
  const pointsRedeemed = Math.min(Math.max(0, Math.floor(Number(redeemInput) || 0)), redeemCap);
  const loyaltyDiscount = discountForPoints(pointsRedeemed);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function onProofSelected(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Upload a screenshot image of your payment.');
      return;
    }
    setError('');
    setScanning(true);
    if (proofPreview.startsWith('blob:')) URL.revokeObjectURL(proofPreview);
    setProofPreview(URL.createObjectURL(file));
    try {
      const [stored, found] = await Promise.all([
        compressPaymentProof(file),
        extractPaymentReference(file),
      ]);
      setProofDataUrl(stored);
      if (found) setReference(found);
      else setError('Could not read a reference ID from that image. Check the screenshot or type the reference yourself.');
    } catch (err) {
      console.error(err);
      setProofDataUrl('');
      setProofPreview('');
      setError(err?.message || 'Could not read that payment screenshot.');
    } finally {
      setScanning(false);
    }
  }

  function clearProof() {
    if (proofPreview.startsWith('blob:')) URL.revokeObjectURL(proofPreview);
    setProofPreview('');
    setProofDataUrl('');
  }

  async function submit(event) {
    event.preventDefault();
    if (!business || cart.lines.length === 0) return;
    const codEnabled = cashOnDeliveryEnabled(business);
    const method = codEnabled && payMethod === 'cod' ? 'cod' : 'prepaid';
    const paymentError = checkoutPaymentError({
      codEnabled,
      method,
      name,
      phone,
      reference,
      hasProof: Boolean(proofDataUrl),
      dineInNeedsSeat: orderType === 'dineIn' && serveAtTable,
      seatingNote,
    });
    if (paymentError) {
      setError(paymentError);
      return;
    }
    setSubmitting(true);
    setError('');
    const identityNow = user && !isGuest(user) ? user : null;
    saveCustomer(slug, identityNow, { name: name.trim(), phone: phone.trim() });
    try {
      const notify = await enableOrderAlerts().catch(() => null);
      const placed = await placeOrder({
        business,
        cart,
        customerName: name,
        phone,
        orderType,
        paymentReference: reference,
        orderNotes,
        paymentProofUrl: proofDataUrl,
        seatingNote: orderType === 'dineIn' && serveAtTable ? seatingNote.trim() : '',
        dineInPickup: orderType === 'dineIn' && !serveAtTable,
        slug,
        notify,
        pointsRedeemed,
        paymentMethod: method === 'cod' ? 'cod' : 'manual',
      });
      const { paymentProofUrl: _proof, ...remembered } = placed;
      rememberOrder(slug, identityNow, { ...remembered, createdAt: Date.now() });
      cart.clear();
      navigate(`/b/${slug}/order/${placed.id}`);
    } catch (err) {
      console.error(err);
      setError('The order could not be placed. Try again in a moment.');
      setSubmitting(false);
    }
  }

  return (
    <form className="px-4 py-6" onSubmit={submit}>
      <h1 className="text-2xl font-bold">Checkout</h1>
      <div className="mt-3 rounded-3xl bg-white p-4 text-sm">
        <div className="flex justify-between"><span>Subtotal</span><span>{money(cart.subtotal)}</span></div>
        {loyaltyDiscount > 0 ? <div className="mt-1 flex justify-between text-brand"><span>Loyalty</span><span>-{money(loyaltyDiscount)}</span></div> : null}
        <div className="mt-2 flex justify-between text-lg font-bold"><span>Total</span><span>{money(cart.subtotal - loyaltyDiscount)}</span></div>
      </div>
      {identity && balance > 0 ? (
        <div className="mt-3 rounded-3xl bg-orange-50 p-4">
          <p className="font-semibold">Loyalty points</p>
          <p className="text-sm text-stone-600">Available: {balance} points. This order can use {redeemCap}.</p>
          <label className="mt-2 block text-sm font-semibold">Use points
            <input className="mt-1 w-full rounded-2xl border border-stone-200 px-3 py-3" type="number" min="0" max={redeemCap} value={redeemInput} onChange={(event) => setRedeemInput(event.target.value)} />
          </label>
          <p className="mt-2 text-sm">Discount: -{money(loyaltyDiscount)}</p>
        </div>
      ) : null}
      <p className="text-stone-500">Total {money(cart.subtotal)}. Allow notifications so status updates still appear after you close this page.</p>
      <label className="mt-4 block text-sm font-semibold">Name<input className="mt-1 w-full rounded-2xl border border-stone-200 px-3 py-3" value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name" autoComplete="name" /></label>
      <label className="mt-3 block text-sm font-semibold">Phone<input className="mt-1 w-full rounded-2xl border border-stone-200 px-3 py-3" value={phone} onChange={(event) => setPhone(phoneDigits(event.target.value))} inputMode="numeric" maxLength={11} placeholder="03000000000" autoComplete="tel" /></label>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {['takeaway', 'dineIn'].map((type) => (
          <button key={type} type="button" className={`rounded-2xl border py-3 font-semibold ${orderType === type ? 'border-brand bg-orange-50' : 'border-stone-200 bg-white'}`} onClick={() => setOrderType(type)}>{type === 'dineIn' ? 'Dine-in' : 'Takeaway'}</button>
        ))}
      </div>
      {orderType === 'dineIn' ? (
        <div className="mt-3 rounded-3xl bg-white p-4">
          <p className="text-sm font-semibold">Where should we bring it?</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button type="button" className={`rounded-2xl border py-3 text-sm font-semibold ${serveAtTable ? 'border-brand bg-orange-50' : 'border-stone-200'}`} onClick={() => setServeAtTable(true)}>Serve at my seat</button>
            <button type="button" className={`rounded-2xl border py-3 text-sm font-semibold ${!serveAtTable ? 'border-brand bg-orange-50' : 'border-stone-200'}`} onClick={() => setServeAtTable(false)}>I’ll collect it</button>
          </div>
          {serveAtTable ? (
            <label className="mt-3 block text-sm font-semibold">Table or seat
              <textarea className="mt-1 w-full rounded-2xl border border-stone-200 px-3 py-3" rows={3} value={seatingNote} onChange={(event) => setSeatingNote(event.target.value)} placeholder="Write the table number if it is available. Otherwise say which kiosk you are sitting in front of, and which table, so we can serve you." />
            </label>
          ) : (
            <p className="mt-3 text-sm text-stone-600">When the order is ready, collect it from the shop and give your order number.</p>
          )}
        </div>
      ) : null}
      <label className="mt-4 block text-sm font-semibold">Order notes
        <textarea
          className="mt-1 w-full rounded-2xl border border-stone-200 px-3 py-3 font-normal"
          rows={3}
          value={orderNotes}
          onChange={(event) => setOrderNotes(event.target.value)}
          placeholder="Any note about the order? Allergies, less spice, cutlery, timing…"
          maxLength={500}
        />
      </label>
      {cashOnDeliveryEnabled(business) ? (
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button type="button" className={`rounded-2xl border py-3 text-sm font-semibold ${payMethod === 'cod' ? 'border-brand bg-orange-50' : 'border-stone-200 bg-white'}`} onClick={() => setPayMethod('cod')}>Cash on Delivery</button>
          <button type="button" className={`rounded-2xl border py-3 text-sm font-semibold ${payMethod !== 'cod' ? 'border-brand bg-orange-50' : 'border-stone-200 bg-white'}`} onClick={() => setPayMethod('prepaid')}>Prepaid (EasyPaisa / JazzCash)</button>
        </div>
      ) : (
        <p className="mt-4 text-sm font-semibold">Prepaid (EasyPaisa / JazzCash)</p>
      )}
      {payMethod === 'cod' && cashOnDeliveryEnabled(business) ? (
        <p className="mt-3 rounded-3xl bg-orange-50 p-4 text-sm">Pay cash when you collect or receive the order. No transfer is needed now.</p>
      ) : (
        <>
      <PaymentDetails business={business} className="mt-4" />
      <div className="mt-3 rounded-3xl bg-white p-4">
        <p className="text-sm font-semibold">Payment screenshot (optional)</p>
        <p className="mt-1 text-sm text-stone-600">You can type the reference, or upload a screenshot and we will try to read it. The reference is what we need.</p>
        <label className="mt-3 flex cursor-pointer items-center justify-center rounded-2xl border border-dashed border-stone-300 bg-stone-50 px-3 py-4 text-sm font-semibold text-brand">
          <input className="hidden" type="file" accept="image/*" capture="environment" onChange={onProofSelected} disabled={scanning || submitting} />
          {scanning ? 'Reading screenshot…' : proofDataUrl ? 'Replace screenshot' : 'Upload screenshot to fill the reference'}
        </label>
        {proofPreview ? (
          <div className="mt-3 overflow-hidden rounded-2xl border border-stone-200">
            <img src={proofPreview || proofDataUrl} alt="Payment screenshot preview" className="max-h-56 w-full object-contain bg-stone-100" />
            <button type="button" className="w-full py-2 text-sm font-semibold text-red-600" onClick={clearProof} disabled={scanning || submitting}>Remove</button>
          </div>
        ) : null}
      </div>
      <label className="mt-3 block text-sm font-semibold">Payment reference
        <input className="mt-1 w-full rounded-2xl border border-stone-200 px-3 py-3" value={reference} onChange={(event) => setReference(event.target.value)} placeholder="Filled from your screenshot when possible" />
      </label>
        </>
      )}
      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      <button type="submit" disabled={submitting || scanning || cart.lines.length === 0} className="mt-5 w-full rounded-full bg-brand py-4 font-semibold text-white disabled:opacity-60">{submitting ? 'Placing order…' : 'Place order'}</button>
    </form>
  );
}
