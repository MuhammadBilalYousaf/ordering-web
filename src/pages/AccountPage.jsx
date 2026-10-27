import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useBusiness } from '../context/BusinessContext';
import { awardCompletedOrders, watchLoyalty, watchLoyaltyActivity } from '../services/loyalty';
import { continueAsGuest, isGuest, loadCustomer, signInCustomer, signOutCustomer, signUpCustomer, watchAuth } from '../services/auth';

export function AccountPage() {
  const { slug, business } = useBusiness();
  const [user, setUser] = useState(undefined);
  const [mode, setMode] = useState('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [profile, setProfile] = useState(null);
  const [loyalty, setLoyalty] = useState({ pointsBalance: 0 });
  const [activity, setActivity] = useState([]);

  useEffect(() => watchAuth(setUser), []);
  useEffect(() => {
    if (!user || isGuest(user)) {
      setProfile(null);
      return undefined;
    }
    let active = true;
    loadCustomer(user.uid).then((data) => {
      if (active) setProfile(data);
    }).catch(() => {
      if (active) setProfile(null);
    });
    return () => {
      active = false;
    };
  }, [user]);
  useEffect(() => {
    if (!user || isGuest(user) || !business?.businessId) return undefined;
    const stopBalance = watchLoyalty(business.businessId, user.uid, setLoyalty);
    const stopActivity = watchLoyaltyActivity(business.businessId, user.uid, setActivity);
    awardCompletedOrders(business.businessId, user.uid).catch((error) => console.error(error));
    return () => {
      stopBalance();
      stopActivity();
    };
  }, [user, business]);

  async function run(action) {
    setBusy(true);
    setError('');
    try {
      await action();
    } catch (err) {
      console.error(err);
      setError(err.code === 'auth/email-already-in-use' ? 'That email already has an account. Sign in instead.' : 'That did not work. Check the email and password.');
    } finally {
      setBusy(false);
    }
  }

  if (user === undefined) return <p className="p-8 text-center">Loading account…</p>;

  if (user && !isGuest(user)) {
    const displayName = profile?.name || user.displayName || 'Customer';
    const phone = profile?.phone || '';
    const initial = displayName.trim().charAt(0).toUpperCase() || 'C';
    return (
      <div className="px-4 py-6">
        <div className="overflow-hidden rounded-[28px] bg-gradient-to-br from-brand to-orange-700 text-white shadow-lg">
          <div className="px-5 pb-6 pt-7">
            <p className="text-sm font-medium text-white/80">Your account</p>
            <div className="mt-4 flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-2xl font-bold text-brand shadow">{initial}</div>
              <div className="min-w-0">
                <h1 className="truncate text-2xl font-bold">{displayName}</h1>
                <p className="truncate text-sm text-white/80">{user.email}</p>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-4 overflow-hidden rounded-3xl bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-stone-100 px-4 py-4">
            <span className="text-sm text-stone-500">Email</span>
            <span className="max-w-[60%] truncate font-semibold">{user.email}</span>
          </div>
          <div className="flex items-center justify-between px-4 py-4">
            <span className="text-sm text-stone-500">Phone</span>
            <span className="font-semibold">{phone || 'Not added'}</span>
          </div>
        </div>
        <div className="mt-4 rounded-3xl bg-white p-4 shadow-sm">
          <p className="text-sm text-stone-500">Loyalty points</p>
          <p className="text-3xl font-bold">{Math.floor(Number(loyalty.pointsBalance) || 0)} Points</p>
          <p className="text-sm text-stone-500">Available to redeem: {Math.floor(Number(loyalty.pointsBalance) || 0)}</p>
          <div className="mt-3 grid gap-2">
            {activity.length === 0 ? <p className="text-sm text-stone-400">No loyalty activity yet.</p> : activity.map((item) => (
              <div key={item.id} className="flex items-center justify-between text-sm">
                <span className={item.points > 0 ? 'font-semibold text-green-700' : 'font-semibold text-brand'}>{item.points > 0 ? `+${item.points}` : item.points}</span>
                <span className="text-stone-500">Order {item.orderNumber || ''}</span>
                <span>{item.type === 'EARN' ? 'Earned' : item.type === 'REDEEM' ? 'Redeemed' : 'Reversed'}</span>
              </div>
            ))}
          </div>
        </div>
        <Link to={`/b/${slug}/orders`} className="mt-4 flex items-center justify-between rounded-3xl bg-white px-4 py-4 shadow-sm">
          <span>
            <span className="block font-semibold">Your orders</span>
            <span className="text-sm text-stone-500">Track what you have ordered</span>
          </span>
          <span className="text-brand">→</span>
        </Link>
        <button type="button" className="mt-4 w-full rounded-full border border-stone-300 bg-white py-3 font-semibold" onClick={() => signOutCustomer()}>Sign out</button>
      </div>
    );
  }

  return (
    <div className="px-4 py-6">
      <h1 className="text-2xl font-bold">{user ? 'Save your orders' : 'Account'}</h1>
      <p className="mt-1 text-sm text-stone-500">{user ? 'You are a guest. Create an account to keep this phone’s orders and qualify for later discounts.' : 'Sign in, create an account, or continue as a guest.'}</p>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button type="button" className={`rounded-2xl border py-3 font-semibold ${mode === 'signin' ? 'border-brand bg-orange-50' : 'bg-white'}`} onClick={() => setMode('signin')}>Sign in</button>
        <button type="button" className={`rounded-2xl border py-3 font-semibold ${mode === 'signup' ? 'border-brand bg-orange-50' : 'bg-white'}`} onClick={() => setMode('signup')}>Sign up</button>
      </div>
      <form className="mt-4 grid gap-3" onSubmit={(event) => {
        event.preventDefault();
        if (mode === 'signup') run(() => signUpCustomer({ name, email, password, phone }));
        else run(() => signInCustomer({ email, password }));
      }}>
        {mode === 'signup' ? <input className="rounded-2xl border px-3 py-3" placeholder="Name" value={name} onChange={(event) => setName(event.target.value)} /> : null}
        <input className="rounded-2xl border px-3 py-3" placeholder="Email" value={email} onChange={(event) => setEmail(event.target.value)} />
        {mode === 'signup' ? <input className="rounded-2xl border px-3 py-3" placeholder="Phone" value={phone} onChange={(event) => setPhone(event.target.value)} /> : null}
        <input className="rounded-2xl border px-3 py-3" placeholder="Password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <button disabled={busy} className="rounded-full bg-brand py-3 font-semibold text-white disabled:opacity-60">{busy ? 'Please wait…' : mode === 'signup' ? 'Create account' : 'Sign in'}</button>
      </form>
      <button type="button" className="mt-3 w-full rounded-full border border-stone-300 py-3 font-semibold" onClick={() => run(continueAsGuest)}>Continue as guest</button>
    </div>
  );
}
