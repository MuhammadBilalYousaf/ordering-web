import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useBusiness } from '../context/BusinessContext';
import { continueAsGuest, isGuest, signInCustomer, signOutCustomer, signUpCustomer, watchAuth } from '../services/auth';

export function AccountPage() {
  const { slug } = useBusiness();
  const [user, setUser] = useState(undefined);
  const [mode, setMode] = useState('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => watchAuth(setUser), []);

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
    return (
      <div className="px-4 py-6">
        <h1 className="text-2xl font-bold">Account</h1>
        <p className="mt-2 text-stone-500">Signed in as {user.email}. Repeat orders stay on this account, so loyalty discounts can be added later.</p>
        <Link to={`/b/${slug}/orders`} className="mt-4 block rounded-full bg-ink py-3 text-center font-semibold text-white">Your orders</Link>
        <button type="button" className="mt-3 w-full rounded-full border border-stone-300 py-3 font-semibold" onClick={() => signOutCustomer()}>Sign out</button>
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
