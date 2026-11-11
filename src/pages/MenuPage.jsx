import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useBusiness } from '../context/BusinessContext';
import { useCart } from '../context/CartContext';
import { MenuSkeleton } from '../components/Skeleton';
import { money, unitPrice } from '../utils/pricing';

export function MenuPage() {
  const { slug, business, menu, error } = useBusiness();
  const cart = useCart();
  const [categoryId, setCategoryId] = useState(null);
  const [product, setProduct] = useState(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  if (error) return <p className="p-6">{error}</p>;
  if (!business || !menu) return <MenuSkeleton />;
  const categories = (menu.categories || []).filter((category) => category.active !== false);
  const selected = categories.find((category) => category.id === categoryId) || categories[0];
  const products = (selected?.products || []).filter((item) => item.available !== false);
  const needle = query.trim().toLowerCase();
  const matches = needle
    ? categories.flatMap((category) => (category.products || [])
      .filter((item) => item.available !== false)
      .filter((item) => `${item.name} ${item.description || ''}`.toLowerCase().includes(needle))
      .map((item) => ({ item, category })))
    : [];

  function addProduct(item) {
    const needsChoice = (item.variants || []).length > 1 || (item.addons || []).length > 0 || (item.flavors || []).length > 0;
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
      <header className="flex items-end justify-between gap-3 px-4 pb-2 pt-5 md:px-6 md:pt-8">
        <div>
          <p className="flex items-center gap-2 text-sm text-stone-500 md:hidden">
            {business.logoUrl ? <img src={business.logoUrl} alt="" className="h-7 w-7 rounded-lg bg-white object-contain p-0.5 shadow-sm" /> : null}
            <span className="truncate">{business.name}</span>
          </p>
          <h1 className="text-2xl font-bold">Menu</h1>
        </div>
        <button type="button" className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:scale-[1.03]" onClick={() => setSearchOpen(true)}>Search</button>
      </header>
      <div className="sticky top-0 z-10 flex gap-2 overflow-auto bg-[#f6f3ef] px-4 py-3 md:top-14 md:px-6">
        {categories.map((category) => (
          <button key={category.id} type="button" className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${selected?.id === category.id ? 'bg-ink text-white' : 'bg-white'}`} onClick={() => setCategoryId(category.id)}>{category.name}</button>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2 px-3 pb-24 sm:gap-3 sm:px-4 md:grid-cols-4 md:px-6 lg:grid-cols-5 xl:grid-cols-6">
        {products.map((item, index) => (
          <ProductCard key={item.id} item={item} index={index} onAdd={() => addProduct(item)} />
        ))}
      </div>
      {cart.count > 0 ? <Link to={`/b/${slug}/cart`} className="fixed bottom-16 left-1/2 z-10 w-[min(24rem,calc(100%-1.5rem))] -translate-x-1/2 rounded-full bg-brand px-5 py-2.5 text-center text-sm font-semibold text-white shadow-lg md:bottom-6">View cart · {money(cart.subtotal)}</Link> : null}
      {product ? <ProductSheet product={product} onClose={() => setProduct(null)} onAdd={(line) => { cart.addLine(line); setProduct(null); }} /> : null}
      {searchOpen ? (
        <div className="fixed inset-0 z-40 flex items-start justify-center bg-ink/40 p-3 md:p-10" onClick={() => setSearchOpen(false)}>
          <div className="sheet-enter w-full max-w-lg rounded-3xl bg-white p-4 shadow-xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center gap-2">
              <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search all categories" className="w-full rounded-2xl border border-stone-200 px-4 py-3 text-sm outline-none focus:border-brand" />
              <button type="button" className="shrink-0 rounded-full px-3 py-2 text-sm font-semibold text-stone-500" onClick={() => { setQuery(''); setSearchOpen(false); }}>Close</button>
            </div>
            <div className="mt-3 max-h-[60vh] overflow-auto">
              {!needle ? <p className="px-1 py-6 text-center text-sm text-stone-500">Type a dish name to search every category.</p> : null}
              {needle && matches.length === 0 ? (
                <div className="px-3 py-8 text-center">
                  <p className="text-lg font-bold">Nothing matches “{query.trim()}”</p>
                  <p className="mt-1 text-sm text-stone-500">Try another word. Search looks through every category.</p>
                  <button type="button" className="mt-4 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white" onClick={() => setQuery('')}>Clear search</button>
                </div>
              ) : null}
              {matches.map(({ item, category }) => (
                <button key={`${category.id}-${item.id}`} type="button" className="flex w-full items-center gap-3 rounded-2xl px-2 py-2 text-left transition hover:bg-orange-50" onClick={() => { setSearchOpen(false); addProduct(item); }}>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{item.name}</span>
                    <span className="block truncate text-xs text-stone-500">{category.name}</span>
                  </span>
                  <span className="text-sm font-bold">{money(fromPrice(item))}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function fromPrice(item) {
  return item.variants?.length ? Math.min(...item.variants.map((variant) => Number(variant.price) || 0)) : unitPrice(item, null, []).unit;
}

function ProductCard({ item, index, onAdd }) {
  return (
    <button type="button" style={{ animationDelay: `${Math.min(index, 12) * 35}ms` }} className="card-pop group overflow-hidden rounded-2xl bg-white text-left shadow-md shadow-stone-300/60 transition duration-300 hover:-translate-y-1 hover:shadow-lg" onClick={onAdd}>
      <div className="overflow-hidden bg-orange-50">
        {item.imageUrl
          ? <img src={item.imageUrl} alt="" className="aspect-square w-full object-cover transition duration-500 group-hover:scale-105" />
          : <div className="flex aspect-square w-full items-center justify-center text-2xl">🍽️</div>}
      </div>
      <div className="p-2 md:p-3">
        <h2 className="line-clamp-2 text-xs font-bold leading-snug md:text-sm">{item.name}</h2>
        {item.description ? <p className="mt-1 hidden text-xs leading-snug text-stone-500 md:line-clamp-2 md:block">{item.description}</p> : null}
        <div className="mt-1.5 flex items-center justify-between gap-1">
          <span className="text-xs font-bold md:text-sm">{money(fromPrice(item))}</span>
          <span className="rounded-full bg-brand px-2 py-1 text-[10px] font-semibold text-white md:px-3 md:text-xs">Add</span>
        </div>
      </div>
    </button>
  );
}

function scoopCount(variant) {
  const set = Number(variant?.scoops);
  if (set > 1) return set;
  const name = String(variant?.name || '').toLowerCase();
  if (name.includes('triple') || name.includes('three')) return 3;
  if (name.includes('double') || name.includes('two')) return 2;
  return Math.max(1, set || 1);
}

function ProductSheet({ product, onClose, onAdd }) {
  const flavors = (product.flavors || []).filter((flavor) => flavor.name.trim().toLowerCase() !== product.name.trim().toLowerCase());
  const [variantId, setVariantId] = useState(product.variants?.[0]?.id || null);
  const [addonIds, setAddonIds] = useState([]);
  const [flavorIds, setFlavorIds] = useState([]);
  const [quantity, setQuantity] = useState(1);
  const [choiceError, setChoiceError] = useState('');
  const priced = useMemo(() => unitPrice(product, variantId, addonIds), [product, variantId, addonIds]);
  const selectedVariant = (product.variants || []).find((item) => item.id === variantId) || product.variants?.[0] || null;
  const scoops = flavors.length ? scoopCount(selectedVariant) : 1;
  const extraScoops = Math.max(0, scoops - 1);
  return (
    <div className="fixed inset-0 z-30 flex items-end bg-ink/40 md:items-center md:justify-center md:p-8" onClick={onClose}>
      <div className="sheet-enter max-h-[88vh] w-full overflow-auto rounded-t-3xl bg-white p-5 md:max-w-lg md:rounded-3xl" onClick={(event) => event.stopPropagation()}>
        {product.imageUrl ? (
          <div className="relative mb-3 aspect-square w-full overflow-hidden rounded-2xl bg-orange-50">
            <img src={product.imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
          </div>
        ) : null}
        <h2 className="text-xl font-bold">{product.name}</h2>
        {product.description ? <p className="mt-1 text-sm text-stone-500">{product.description}</p> : null}
        <div className="mt-4 grid gap-2">
          {(product.variants || []).map((variant) => (
            <button key={variant.id} type="button" className={`rounded-2xl border px-3 py-3 text-left transition ${variantId === variant.id ? 'border-brand bg-orange-50' : 'border-stone-200'}`} onClick={() => setVariantId(variant.id)}>
              {variant.name}<span className="float-right">{money(variant.price)}</span>
            </button>
          ))}
          {extraScoops > 0 ? <p className="text-sm text-stone-500">Scoop 1 is {product.name}. Choose the other scoop{extraScoops > 1 ? 's' : ''}.</p> : null}
          {extraScoops > 0 ? Array.from({ length: extraScoops }, (_, index) => (
            <label key={index} className="block text-sm font-semibold">Scoop {index + 2}
              <select className="mt-1 w-full rounded-2xl border border-stone-200 bg-white px-3 py-3 font-normal" value={flavorIds[index] || ''} onChange={(event) => setFlavorIds((current) => {
                const next = [...current];
                next[index] = event.target.value;
                return next;
              })}>
                <option value="">Choose a flavor</option>
                {flavors.map((flavor) => <option key={flavor.id} value={flavor.id}>{flavor.name}</option>)}
              </select>
            </label>
          )) : null}
          {(product.addons || []).map((addon) => (
            <button key={addon.id} type="button" className={`rounded-2xl border px-3 py-3 text-left transition ${addonIds.includes(addon.id) ? 'border-brand bg-orange-50' : 'border-stone-200'}`} onClick={() => setAddonIds((current) => current.includes(addon.id) ? current.filter((id) => id !== addon.id) : [...current, addon.id])}>
              {addon.name}<span className="float-right">+{money(addon.price)}</span>
            </button>
          ))}
        </div>
        {choiceError ? <p className="mt-3 text-sm text-red-600">{choiceError}</p> : null}
        <div className="mt-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button type="button" className="h-10 w-10 rounded-full bg-stone-100" onClick={() => setQuantity((value) => Math.max(1, value - 1))}>−</button>
            <span className="w-6 text-center font-semibold">{quantity}</span>
            <button type="button" className="h-10 w-10 rounded-full bg-stone-100" onClick={() => setQuantity((value) => value + 1)}>+</button>
          </div>
          <button type="button" className="rounded-full bg-brand px-5 py-3 font-semibold text-white" onClick={() => {
            const chosen = Array.from({ length: extraScoops }, (_, index) => flavors.find((flavor) => flavor.id === flavorIds[index])).filter(Boolean);
            if (extraScoops > 0 && chosen.length < extraScoops) {
              setChoiceError(extraScoops === 1 ? 'Choose the second scoop.' : 'Choose a flavor for each extra scoop.');
              return;
            }
            setChoiceError('');
            const flavorKey = chosen.map((flavor) => flavor.id).join(',');
            const savedFlavors = extraScoops > 0
              ? [{ id: 'base', name: product.name }, ...chosen.map((flavor) => ({ id: flavor.id, name: flavor.name }))]
              : [];
            onAdd({
              key: [product.id, variantId || '', [...addonIds].sort().join(','), flavorKey].join('|'),
              productId: product.id,
              name: product.name,
              imageUrl: product.imageUrl || '',
              variantId,
              variantName: priced.variant?.name || null,
              flavors: savedFlavors,
              addons: priced.addons.map((addon) => ({ id: addon.id, name: addon.name, price: Number(addon.price) || 0 })),
              quantity,
              unitPrice: priced.unit,
            });
          }}>Add {money(priced.unit * quantity)}</button>
        </div>
      </div>
    </div>
  );
}
