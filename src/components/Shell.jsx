import { NavLink, useLocation } from 'react-router-dom';
import { useBusiness } from '../context/BusinessContext';
import { useCart } from '../context/CartContext';

const tabs = [
  { to: '', label: 'Home', icon: '⌂' },
  { to: 'menu', label: 'Menu', icon: '☰' },
  { to: 'cart', label: 'Cart', icon: '▢' },
  { to: 'orders', label: 'Orders', icon: '☰' },
  { to: 'account', label: 'Account', icon: '☺' },
];

export function Shell({ slug, children }) {
  const cart = useCart();
  const { business } = useBusiness();
  const location = useLocation();
  return (
    <div className="min-h-screen pb-20 md:pb-10">
      <header className="sticky top-0 z-30 hidden border-b border-stone-200 bg-white/95 backdrop-blur md:block">
        <div className="mx-auto flex max-w-6xl items-center gap-6 px-6 py-3">
          <NavLink to={`/b/${slug}`} end className="flex min-w-0 shrink-0 items-center gap-2">
            {business?.logoUrl ? <img src={business.logoUrl} alt="" className="h-9 w-9 shrink-0 rounded-xl bg-stone-50 object-contain p-0.5" /> : null}
            <p className="truncate text-lg font-bold text-ink">{business?.name || 'Order'}</p>
          </NavLink>
          <nav className="flex flex-1 items-center gap-1">
            {tabs.map((tab) => (
              <NavLink
                key={tab.label}
                to={`/b/${slug}/${tab.to}`}
                end={tab.to === ''}
                className={({ isActive }) => `relative rounded-full px-4 py-2 text-sm font-semibold transition duration-200 ${isActive ? 'bg-ink text-white' : 'text-stone-600 hover:bg-stone-100'}`}
              >
                {tab.label}
                {tab.to === 'cart' && cart.count > 0 ? <span className="ml-2 rounded-full bg-brand px-1.5 text-[10px] text-white">{cart.count}</span> : null}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <div className="mx-auto w-full max-w-6xl">
        <div key={location.pathname} className="page-enter">
          {children}
        </div>
      </div>
      <nav className="fixed bottom-0 left-0 z-20 flex w-full justify-between border-t border-stone-200 bg-white/95 px-1 py-1.5 backdrop-blur md:hidden">
        {tabs.map((tab) => (
          <NavLink
            key={tab.label}
            to={`/b/${slug}/${tab.to}`}
            end={tab.to === ''}
            className={({ isActive }) => `flex min-w-0 flex-1 flex-col items-center rounded-2xl px-1 py-1 text-[11px] font-semibold transition ${isActive ? 'bg-orange-50 text-brand' : 'text-stone-500'}`}
          >
            <span className="text-base leading-none">{tab.icon}</span>
            <span className="mt-1">{tab.label}</span>
            {tab.to === 'cart' && cart.count > 0 ? <span className="-mt-6 ml-5 rounded-full bg-brand px-1.5 text-[10px] text-white">{cart.count}</span> : null}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
