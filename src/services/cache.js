const guestKey = (slug) => `ordering-customer:${slug}:guest`;
const accountKey = (slug, email) => `ordering-customer:${slug}:${String(email || '').trim().toLowerCase()}`;

export function cacheKey(slug, user) {
  if (user && !user.isAnonymous && user.email) return accountKey(slug, user.email);
  return guestKey(slug);
}

function readAt(key) {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || '{}');
    return {
      name: parsed.name || '',
      phone: parsed.phone || '',
      orders: Array.isArray(parsed.orders) ? parsed.orders : [],
    };
  } catch {
    return { name: '', phone: '', orders: [] };
  }
}

export function readCustomer(slug, user) {
  const key = cacheKey(slug, user);
  if (!user && !localStorage.getItem(key)) {
    const legacy = localStorage.getItem(`ordering-customer:${slug}`);
    if (legacy) localStorage.setItem(key, legacy);
  }
  return readAt(key);
}

export function saveCustomer(slug, user, patch) {
  const key = cacheKey(slug, user);
  const next = { ...readAt(key), ...patch };
  localStorage.setItem(key, JSON.stringify(next));
  return next;
}

export function rememberOrder(slug, user, order) {
  const current = readCustomer(slug, user);
  const orders = [order, ...current.orders.filter((item) => item.id !== order.id)].slice(0, 30);
  return saveCustomer(slug, user, { orders });
}

export function updateSavedOrder(slug, user, orderId, patch) {
  const current = readCustomer(slug, user);
  if (!current.orders.some((order) => order.id === orderId)) return current;
  const orders = current.orders.map((order) => (order.id === orderId ? { ...order, ...patch } : order));
  return saveCustomer(slug, user, { orders });
}
