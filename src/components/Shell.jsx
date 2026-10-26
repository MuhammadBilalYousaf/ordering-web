import { NavLink, useLocation } from 'react-router-dom';
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
  const location = useLocation();
  return (
    <div className="mx-auto min-h-screen max-w-lg pb-24">
      <div key={location.pathname} className="page-enter">
        {children}
      </div>
      <nav className="fixed bottom-0 left-1/2 z-20 flex w-full max-w-lg -translate-x-1/2 justify-between border-t border-stone-200 bg-white/95 px-2 py-2 backdrop-blur">
        {tabs.map((tab) => (
          <NavLink
            key={tab.label}
            to={`/b/${slug}/${tab.to}`}
            end={tab.to === ''}
            className={({ isActive }) => `flex min-w-0 flex-1 flex-col items-center rounded-2xl px-1 py-1 text-[11px] font-semibold transition ${isActive ? 'bg-orange-50 text-brand' : 'text-stone-500'}`}
          >
            <span className="text-base leading-none">{tab.icon}</span>
            <span className="mt-1">{tab.label}</span>
            {tab.to === 'cart' && cart.count > 0 ? <span className="-mt-6 ml-6 rounded-full bg-brand px-1.5 text-[10px] text-white">{cart.count}</span> : null}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
