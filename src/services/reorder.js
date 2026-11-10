import { unitPrice } from '../utils/pricing.js';

export function planReorder(menu, items) {
  const catalog = new Map();
  for (const category of menu?.categories || []) {
    if (category.active === false) continue;
    for (const product of category.products || []) {
      if (product?.id) catalog.set(product.id, product);
    }
  }
  const lines = [];
  const skipped = [];
  const notes = [];
  for (const item of items || []) {
    const product = catalog.get(item.productId);
    if (!product || product.available === false) {
      skipped.push({ name: item.name || 'Item', reason: 'No longer on the menu' });
      continue;
    }
    const variants = product.variants || [];
    let variant = null;
    if (item.variantId) {
      variant = variants.find((entry) => entry.id === item.variantId) || null;
      if (!variant) {
        skipped.push({ name: product.name, reason: 'That option is no longer offered' });
        continue;
      }
    } else if (variants.length > 1) {
      skipped.push({ name: product.name, reason: 'Choose an option again from the menu' });
      continue;
    } else if (variants.length === 1) {
      variant = variants[0];
    }
    const flavorList = product.flavors || [];
    const pickedFlavors = (item.flavors || []).map((flavor) => flavorList.find((entry) => entry.id === flavor.id)).filter(Boolean);
    if ((item.flavors || []).length > 0 && pickedFlavors.length !== (item.flavors || []).length) {
      notes.push(`${product.name}: a flavor from the last order is no longer offered`);
    }
    const wanted = (item.addons || []).map((addon) => addon.id).filter(Boolean);
    const addons = (product.addons || []).filter((addon) => wanted.includes(addon.id));
    if (wanted.some((id) => !addons.some((addon) => addon.id === id))) {
      notes.push(`${product.name}: some add-ons are no longer available`);
    }
    const priced = unitPrice(product, variant?.id || null, addons.map((addon) => addon.id));
    const previous = Number(item.unitPrice);
    if (Number.isFinite(previous) && previous !== priced.unit) {
      notes.push(`${product.name}: price is now different from the last order`);
    }
    const quantity = Math.max(1, Math.floor(Number(item.quantity) || 1));
    lines.push({
      key: [product.id, variant?.id || '', addons.map((addon) => addon.id).sort().join(','), pickedFlavors.map((flavor) => flavor.id).join(',')].join('|'),
      productId: product.id,
      name: product.name,
      imageUrl: product.imageUrl || item.imageUrl || '',
      variantId: variant?.id || null,
      variantName: priced.variant?.name || null,
      flavors: pickedFlavors.map((flavor) => ({ id: flavor.id, name: flavor.name })),
      addons: priced.addons.map((addon) => ({ id: addon.id, name: addon.name, price: Number(addon.price) || 0 })),
      quantity,
      unitPrice: priced.unit,
    });
  }
  return { lines, skipped, notes };
}
