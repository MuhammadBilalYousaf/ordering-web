import { useEffect, useState } from 'react';
import { watchPublicFeedback } from '../services/feedback';

export function FeedbackCarousel({ businessId }) {
  const [items, setItems] = useState([]);
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  useEffect(() => watchPublicFeedback(businessId, (next) => {
    setItems(next.filter((item) => item.comment || item.rating));
  }), [businessId]);
  useEffect(() => {
    if (items.length < 2) return undefined;
    const timer = window.setInterval(() => {
      setDirection(1);
      setIndex((current) => (current + 1) % items.length);
    }, 7000);
    return () => window.clearInterval(timer);
  }, [items.length]);
  if (items.length === 0) return null;
  const item = items[index % items.length];
  const firstName = String(item.customerName || 'Customer').trim().split(' ')[0] || 'Customer';

  function go(step) {
    setDirection(step);
    setIndex((current) => (current + step + items.length) % items.length);
  }

  return (
    <section className="px-4 pt-5 md:px-6" aria-label="Customer recommendations">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-lg font-bold">What customers say</h2>
        <div className="flex gap-2">
          <button type="button" aria-label="Previous feedback" className="flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-sm transition hover:bg-orange-50" onClick={() => go(-1)}>←</button>
          <button type="button" aria-label="Next feedback" className="flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-sm transition hover:bg-orange-50" onClick={() => go(1)}>→</button>
        </div>
      </div>
      <article key={`${item.id}-${index}`} className={`overflow-hidden rounded-3xl bg-white p-5 shadow-sm ${direction > 0 ? 'slide-left' : 'slide-right'}`}>
        <p className="text-brand">{'★'.repeat(item.rating || 0)}{'☆'.repeat(Math.max(0, 5 - (item.rating || 0)))}</p>
        <p className="mt-2 text-base leading-relaxed">{item.comment || 'Rated this order.'}</p>
        <p className="mt-3 text-sm font-semibold text-stone-500">{firstName}{item.orderNumber ? ` · Order ${item.orderNumber}` : ''}</p>
      </article>
    </section>
  );
}
