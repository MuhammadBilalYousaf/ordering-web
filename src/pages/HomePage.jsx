import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useBusiness } from '../context/BusinessContext';
import { useCart } from '../context/CartContext';
import { isGuest, loadCustomer, watchAuth } from '../services/auth';
import { FeedbackCarousel } from '../components/FeedbackCarousel';
import { PageSkeleton } from '../components/Skeleton';
import { money } from '../utils/pricing';

export function HomePage() {
  const { slug, business, error } = useBusiness();
  const cart = useCart();
  const [user, setUser] = useState(undefined);
  const [name, setName] = useState('');
  useEffect(() => watchAuth(setUser), []);
  useEffect(() => {
    if (!user || isGuest(user)) {
      setName('');
      return undefined;
    }
    let active = true;
    const fallback = user.displayName || '';
    setName(fallback);
    loadCustomer(user.uid).then((profile) => {
      if (active && profile?.name) setName(profile.name);
    }).catch(() => {});
    return () => {
      active = false;
    };
  }, [user]);
  const signedIn = user && !isGuest(user);
  if (error) return <p className="p-6 text-center">{error}</p>;
  if (business === undefined) return <PageSkeleton cards={2} />;
  if (!business) return <p className="p-8 text-center">This restaurant link is not active.</p>;
  return (
    <div>
      <header className="bg-ink px-5 pb-8 pt-8 text-white md:mx-6 md:mt-6 md:rounded-3xl md:px-10 md:py-12">
        <div className="flex items-center gap-4">
          {business.logoUrl ? <img src={business.logoUrl} alt="" className="h-16 w-16 shrink-0 rounded-2xl bg-white object-contain p-1.5 md:h-20 md:w-20" /> : null}
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.2em] text-orange-200">Welcome</p>
            <h1 className="mt-2 text-3xl font-bold md:text-5xl">{business.name}</h1>
          </div>
        </div>
        <p className="mt-2 max-w-lg text-sm text-stone-300">Order as a guest, or sign in so repeat visits can earn discounts later.</p>
      </header>
      <FeedbackCarousel businessId={business.businessId} />
      <div className="-mt-4 grid gap-3 px-4 md:mt-6 md:grid-cols-3 md:px-6">
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
          <p className="truncate text-lg font-bold">{user === undefined ? '…' : signedIn ? (name || 'Account') : 'Guest'}</p>
        </Link>
        </div>
        <div className="rounded-3xl bg-orange-50 p-5">
          <p className="text-sm font-semibold text-brand">Pay to</p>
          <p className="mt-1 text-lg font-bold">{business.paymentAccountName}</p>
          <p>{business.paymentAccountNumber}</p>
          <p className="text-sm text-stone-600">{business.paymentInstructions}</p>
          {business.paymentQrUrl ? (
            <div className="mt-4 overflow-hidden rounded-2xl border border-orange-100 bg-white p-3">
              <p className="text-sm font-semibold text-stone-700">Scan to pay</p>
              <img src={business.paymentQrUrl} alt="Payment QR code" className="mx-auto mt-2 max-h-52 w-full object-contain" />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
