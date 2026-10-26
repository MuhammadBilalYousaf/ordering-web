const keyFor = (slug) => `ordering-customer:${slug}`;

export function readCustomer(slug) {
  try {
    const parsed = JSON.parse(localStorage.getItem(keyFor(slug)) || '{}');
    return {
      name: parsed.name || '',
      phone: parsed.phone || '',
      orders: Array.isArray(parsed.orders) ? parsed.orders : [],
    };
  } catch {
    return { name: '', phone: '', orders: [] };
  }
}

export function saveCustomer(slug, patch) {
  const current = readCustomer(slug);
  const next = { ...current, ...patch };
  localStorage.setItem(keyFor(slug), JSON.stringify(next));
  return next;
}

export function rememberOrder(slug, order) {
  const current = readCustomer(slug);
  const orders = [order, ...current.orders.filter((item) => item.id !== order.id)].slice(0, 30);
  return saveCustomer(slug, { orders });
}
