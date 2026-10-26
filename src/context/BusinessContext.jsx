import { createContext, useContext, useEffect, useState } from 'react';
import { watchBusiness, watchMenu } from '../services/store';

const BusinessContext = createContext(null);

export function BusinessProvider({ slug, children }) {
  const [business, setBusiness] = useState(undefined);
  const [menu, setMenu] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => watchBusiness(slug, setBusiness, setError), [slug]);
  useEffect(() => {
    if (!business?.businessId) return undefined;
    return watchMenu(business.businessId, setMenu, setError);
  }, [business]);

  return (
    <BusinessContext.Provider value={{ slug, business, menu, error }}>
      {children}
    </BusinessContext.Provider>
  );
}

export function useBusiness() {
  const value = useContext(BusinessContext);
  if (!value) throw new Error('Business is unavailable');
  return value;
}
