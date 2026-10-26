import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const CartContext = createContext(null);

export function CartProvider({ slug, children }) {
  const storageKey = `staffpro-cart:${slug}`;
  const [lines, setLines] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(storageKey) || '[]');
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(lines));
  }, [storageKey, lines]);

  const api = useMemo(() => {
    const count = lines.reduce((sum, line) => sum + line.quantity, 0);
    const subtotal = lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
    return {
      lines,
      count,
      subtotal,
      addLine(line) {
        setLines((current) => {
          const index = current.findIndex((item) => item.key === line.key);
          if (index === -1) return [...current, line];
          return current.map((item, i) => (i === index ? { ...item, quantity: item.quantity + line.quantity } : item));
        });
      },
      setQuantity(key, quantity) {
        setLines((current) => current.flatMap((item) => {
          if (item.key !== key) return [item];
          if (quantity < 1) return [];
          return [{ ...item, quantity }];
        }));
      },
      clear() {
        setLines([]);
      },
    };
  }, [lines]);

  return <CartContext.Provider value={api}>{children}</CartContext.Provider>;
}

export function useCart() {
  const value = useContext(CartContext);
  if (!value) throw new Error('Cart is unavailable');
  return value;
}
