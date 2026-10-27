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

  function addProduct(item) {
    const needsChoice = (item.variants || []).length > 1 || (item.addons || []).length > 0;
    if (needsChoice) {
      setProduct(item);
      return;
    }
    const variant = item.variants?.[0] || null;
    const priced = unitPrice(item, variant?.id || null, []);
    cart.addLine({
      key: [item.id, variant?.id || '', ''].join('|'),
      productId: item.id,
      name: item.name,
      imageUrl: item.imageUrl || '',
      variantId: variant?.id || null,
      variantName: priced.variant?.name || null,
      addons: [],
      quantity: 1,
      unitPrice: priced.unit,
    });
  }

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
      <div className="grid grid-cols-1 gap-4 px-4 pb-24 sm:grid-cols-2">
        {products.map((item, index) => {
          const from = item.variants?.length ? Math.min(...item.variants.map((variant) => Number(variant.price) || 0)) : unitPrice(item, null, []).unit;
          return (
            <button key={item.id} type="button" style={{ animationDelay: `${index * 40}ms` }} className="card-pop group overflow-hidden rounded-3xl bg-white text-left shadow-md shadow-stone-300/70 transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-stone-400/50" onClick={() => addProduct(item)}>
              <div className="overflow-hidden bg-orange-50">
                {item.imageUrl
                  ? <img src={item.imageUrl} alt="" className="h-48 w-full object-cover transition duration-500 group-hover:scale-110" />
                  : <div className="flex h-48 w-full items-center justify-center text-4xl transition duration-500 group-hover:scale-110">🍽️</div>}
              </div>
              <div className="flex items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-bold leading-snug">{item.name}</h2>
                  {item.description ? <p className="mt-1 text-sm leading-snug text-stone-500">{item.description}</p> : null}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <span className="text-base font-bold">{money(from)}</span>
                  <span className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm transition group-hover:scale-105">Add</span>
                </div>
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
        {product.imageUrl ? <img src={product.imageUrl} alt="" className="mb-3 h-44 w-full rounded-2xl object-cover" /> : null}
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
            imageUrl: product.imageUrl || '',
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
