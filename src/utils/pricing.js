export function unitPrice(product, variantId, addonIds) {
  const variant = (product.variants || []).find((item) => item.id === variantId) || null;
  const base = variant ? Number(variant.price) || 0 : Number(product.price) || 0;
  const addons = (product.addons || []).filter((item) => addonIds.includes(item.id));
  const extra = addons.reduce((sum, item) => sum + (Number(item.price) || 0), 0);
  return { unit: base + extra, variant, addons };
}

export function money(value) {
  const amount = Number(value) || 0;
  return `Rs ${amount.toLocaleString('en-PK', { maximumFractionDigits: 0 })}`;
}
