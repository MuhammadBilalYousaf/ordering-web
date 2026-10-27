import { Link } from 'react-router-dom';
import { useBusiness } from '../context/BusinessContext';
import { useCart } from '../context/CartContext';
import { money } from '../utils/pricing';

function productImage(menu, productId, fallback) {
  if (fallback) return fallback;
  for (const category of menu?.categories || []) {
    const product = (category.products || []).find((item) => item.id === productId);
    if (product?.imageUrl) return product.imageUrl;
  }
  return '';
}

function ItemPhoto({ src, alt }) {
  return (
    <div className="thumb-in h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-orange-50 shadow-sm">
      {src
        ? <img src={src} alt={alt} className="h-full w-full object-cover" />
        : <div className="flex h-full w-full items-center justify-center text-2xl">🍽️</div>}
    </div>
  );
}

export function CartPage() {
  const { slug, menu } = useBusiness();
  const cart = useCart();
  return (
    <div className="px-4 py-6">
      <h1 className="text-2xl font-bold">Cart</h1>
      {cart.lines.length === 0 ? <p className="mt-6 text-stone-500">Your cart is empty. The menu is one tab away.</p> : (
        <div className="mt-4 grid gap-3">
          {cart.lines.map((line, index) => (
            <div key={line.key} style={{ animationDelay: `${index * 50}ms` }} className="card-pop relative flex gap-3 rounded-3xl bg-white p-3 pr-8 shadow-md shadow-stone-300/60">
              <button type="button" aria-label={`Remove ${line.name}`} className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full text-sm font-bold text-stone-400 transition hover:bg-stone-100 hover:text-stone-700" onClick={() => cart.removeLine(line.key)}>×</button>
              <ItemPhoto src={productImage(menu, line.productId, line.imageUrl)} alt={line.name} />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold leading-snug">{line.name}</p>
                    <p className="text-sm leading-snug text-stone-500">{[line.variantName, ...(line.addons || []).map((addon) => addon.name)].filter(Boolean).join(' · ') || 'Standard'}</p>
                  </div>
                  <p className="shrink-0 font-bold">{money(line.unitPrice * line.quantity)}</p>
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <button type="button" disabled={line.quantity <= 1} className="h-9 w-9 rounded-full bg-stone-100 transition active:scale-90 disabled:cursor-not-allowed disabled:opacity-40" onClick={() => cart.setQuantity(line.key, line.quantity - 1)}>−</button>
                  <span key={line.quantity} className="status-line w-4 text-center font-semibold">{line.quantity}</span>
                  <button type="button" className="h-9 w-9 rounded-full bg-stone-100 transition active:scale-90" onClick={() => cart.setQuantity(line.key, line.quantity + 1)}>+</button>
                </div>
              </div>
            </div>
          ))}
          <div className="flex justify-between px-1 text-lg font-bold"><span>Total</span><span>{money(cart.subtotal)}</span></div>
          <Link to={`/b/${slug}/checkout`} className="rounded-full bg-brand py-4 text-center font-semibold text-white shadow-lg shadow-orange-200 transition hover:scale-[1.02]">Checkout</Link>
        </div>
      )}
    </div>
  );
}
