import { Link } from 'react-router-dom';
import { useBusiness } from '../context/BusinessContext';
import { useCart } from '../context/CartContext';
import { money } from '../utils/pricing';

export function CartPage() {
  const { slug } = useBusiness();
  const cart = useCart();
  return (
    <div className="px-4 py-6">
      <h1 className="text-2xl font-bold">Cart</h1>
      {cart.lines.length === 0 ? <p className="mt-6 text-stone-500">Your cart is empty. The menu is one tab away.</p> : (
        <div className="mt-4 grid gap-3">
          {cart.lines.map((line) => (
            <div key={line.key} className="rounded-3xl bg-white p-4 shadow-sm">
              <div className="flex justify-between gap-3">
                <div>
                  <p className="font-semibold">{line.name}</p>
                  <p className="text-sm text-stone-500">{[line.variantName, ...(line.addons || []).map((addon) => addon.name)].filter(Boolean).join(' · ') || 'Standard'}</p>
                </div>
                <p className="font-semibold">{money(line.unitPrice * line.quantity)}</p>
              </div>
              <div className="mt-3 flex items-center gap-3">
                <button type="button" className="h-9 w-9 rounded-full bg-stone-100" onClick={() => cart.setQuantity(line.key, line.quantity - 1)}>−</button>
                <span>{line.quantity}</span>
                <button type="button" className="h-9 w-9 rounded-full bg-stone-100" onClick={() => cart.setQuantity(line.key, line.quantity + 1)}>+</button>
              </div>
            </div>
          ))}
          <div className="flex justify-between px-1 text-lg font-bold"><span>Total</span><span>{money(cart.subtotal)}</span></div>
          <Link to={`/b/${slug}/checkout`} className="rounded-full bg-brand py-4 text-center font-semibold text-white">Checkout</Link>
        </div>
      )}
    </div>
  );
}
