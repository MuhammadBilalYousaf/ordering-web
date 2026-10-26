import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useBusiness } from '../context/BusinessContext';
import { useCart } from '../context/CartContext';
import { money, unitPrice } from '../utils/pricing';

export function MenuPage() {
  const { slug, business, menu, error } = useBusiness();
  const cart = useCart();
  const [categoryId, setCategoryId] = useState(null);
  const [product, setProduct] = useState(null);
  if (error) return <p className="p-6">{error}</p>;
  if (!business || !menu) return <p className="p-8 text-center">Loading menu…</p>;
  const categories = (menu.categories || []).filter((category) => category.active !== false);
  const selected = categories.find((category) => category.id === categoryId) || categories[0];
  const products = (selected?.products || []).filter((item) => item.available !== false);
  return (
    <div>
      <header className="px-5 pb-2 pt-6">
        <p className="text-sm text-stone-500">{business.name}</p>
        <h1 className="text-2xl font-bold">Menu</h1>
      </header>
      <div className="sticky top-0 z-10 flex gap-2 overflow-auto bg-[#f6f3ef] px-4 py-3">
        {categories.map((category) => (
          <button key={category.id} type="button" className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${selected?.id === category.id ? 'bg-ink text-white' : 'bg-white'}`} onClick={() => setCategoryId(category.id)}>{category.name}</button>
        ))}
      </div>
      <div className="grid gap-3 px-4">
        {products.map((item, index) => {
          const from = item.variants?.length ? Math.min(...item.variants.map((variant) => Number(variant.price) || 0)) : unitPrice(item, null, []).unit;
          return (
            <button key={item.id} type="button" style={{ animationDelay: `${index * 40}ms` }} className="card-pop rounded-3xl bg-white p-4 text-left shadow-sm" onClick={() => setProduct(item)}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold">{item.name}</h2>
                  {item.description ? <p className="mt-1 text-sm text-stone-500">{item.description}</p> : null}
                </div>
                <span className="font-semibold">{money(from)}</span>
              </div>
            </button>
          );
        })}
      </div>
      {cart.count > 0 ? <Link to={`/b/${slug}/cart`} className="fixed bottom-20 left-1/2 z-10 w-[min(28rem,calc(100%-2rem))] -translate-x-1/2 rounded-full bg-brand px-5 py-3 text-center font-semibold text-white shadow-lg">View cart · {money(cart.subtotal)}</Link> : null}
      {product ? <ProductSheet product={product} onClose={() => setProduct(null)} onAdd={(line) => { cart.addLine(line); setProduct(null); }} /> : null}
    </div>
  );
}

function ProductSheet({ product, onClose, onAdd }) {
  const [variantId, setVariantId] = useState(product.variants?.[0]?.id || null);
  const [addonIds, setAddonIds] = useState([]);
  const [quantity, setQuantity] = useState(1);
  const priced = useMemo(() => unitPrice(product, variantId, addonIds), [product, variantId, addonIds]);
  return (
    <div className="fixed inset-0 z-30 flex items-end bg-ink/40" onClick={onClose}>
      <div className="sheet-enter max-h-[88vh] w-full overflow-auto rounded-t-3xl bg-white p-5" onClick={(event) => event.stopPropagation()}>
        <h2 className="text-xl font-bold">{product.name}</h2>
        {product.description ? <p className="mt-1 text-sm text-stone-500">{product.description}</p> : null}
        <div className="mt-4 grid gap-2">
          {(product.variants || []).map((variant) => (
            <button key={variant.id} type="button" className={`rounded-2xl border px-3 py-3 text-left transition ${variantId === variant.id ? 'border-brand bg-orange-50' : 'border-stone-200'}`} onClick={() => setVariantId(variant.id)}>
              {variant.name}<span className="float-right">{money(variant.price)}</span>
            </button>
          ))}
          {(product.addons || []).map((addon) => (
            <button key={addon.id} type="button" className={`rounded-2xl border px-3 py-3 text-left transition ${addonIds.includes(addon.id) ? 'border-brand bg-orange-50' : 'border-stone-200'}`} onClick={() => setAddonIds((current) => current.includes(addon.id) ? current.filter((id) => id !== addon.id) : [...current, addon.id])}>
              {addon.name}<span className="float-right">+{money(addon.price)}</span>
            </button>
          ))}
        </div>
        <div className="mt-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button type="button" className="h-10 w-10 rounded-full bg-stone-100" onClick={() => setQuantity((value) => Math.max(1, value - 1))}>−</button>
            <span className="w-6 text-center font-semibold">{quantity}</span>
            <button type="button" className="h-10 w-10 rounded-full bg-stone-100" onClick={() => setQuantity((value) => value + 1)}>+</button>
          </div>
          <button type="button" className="rounded-full bg-brand px-5 py-3 font-semibold text-white" onClick={() => onAdd({
            key: [product.id, variantId || '', [...addonIds].sort().join(',')].join('|'),
            productId: product.id,
            name: product.name,
            variantId,
            variantName: priced.variant?.name || null,
            addons: priced.addons.map((addon) => ({ id: addon.id, name: addon.name, price: Number(addon.price) || 0 })),
            quantity,
            unitPrice: priced.unit,
          })}>Add {money(priced.unit * quantity)}</button>
        </div>
      </div>
    </div>
  );
}
