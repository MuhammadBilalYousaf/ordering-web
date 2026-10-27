import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useBusiness } from '../context/BusinessContext';
import { useCart } from '../context/CartContext';
import { isGuest, watchAuth } from '../services/auth';
import { money } from '../utils/pricing';

export function HomePage() {
  const { slug, business, error } = useBusiness();
  const cart = useCart();
  const [user, setUser] = useState(undefined);
  useEffect(() => watchAuth(setUser), []);
  const signedIn = user && !isGuest(user);
  if (error) return <p className="p-6 text-center">{error}</p>;
  if (business === undefined) return <p className="p-8 text-center">Loading…</p>;
  if (!business) return <p className="p-8 text-center">This restaurant link is not active.</p>;
  return (
    <div>
      <header className="bg-ink px-5 pb-8 pt-8 text-white">
        <p className="text-xs uppercase tracking-[0.2em] text-orange-200">Welcome</p>
        <h1 className="mt-2 text-3xl font-bold">{business.name}</h1>
        <p className="mt-2 max-w-sm text-sm text-stone-300">Order as a guest, or sign in so repeat visits can earn discounts later.</p>
      </header>
      <div className="-mt-4 grid gap-3 px-4">
        <Link to={`/b/${slug}/menu`} className="card-pop rounded-3xl bg-white p-5 shadow-sm">
          <p className="text-sm text-stone-500">Start here</p>
          <p className="text-xl font-bold">Browse the menu</p>
        </Link>
        <div className="grid grid-cols-2 gap-3">
          <Link to={`/b/${slug}/cart`} className="rounded-3xl bg-white p-4 shadow-sm">
            <p className="text-sm text-stone-500">Cart</p>
            <p className="text-lg font-bold">{cart.count ? money(cart.subtotal) : 'Empty'}</p>
          </Link>
        <Link to={`/b/${slug}/account`} className="rounded-3xl bg-white p-4 shadow-sm">
          <p className="text-sm text-stone-500">Account</p>
          <p className="truncate text-lg font-bold">{user === undefined ? '…' : signedIn ? user.email : 'Guest'}</p>
        </Link>
        </div>
        <div className="rounded-3xl bg-orange-50 p-5">
          <p className="text-sm font-semibold text-brand">Pay to</p>
          <p className="mt-1 text-lg font-bold">{business.paymentAccountName}</p>
          <p>{business.paymentAccountNumber}</p>
          <p className="text-sm text-stone-600">{business.paymentInstructions}</p>
        </div>
      </div>
    </div>
  );
}
