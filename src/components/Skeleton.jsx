export function Skeleton({ className = '' }) {
  return <div className={`skel rounded-2xl ${className}`} aria-hidden="true" />;
}

export function PageSkeleton({ cards = 3 }) {
  return (
    <div className="px-4 py-6 md:px-6" role="status" aria-label="Loading">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="mt-4 h-28 w-full" />
      <div className="mt-4 grid gap-3">
        {Array.from({ length: cards }, (_, index) => <Skeleton key={index} className="h-24 w-full" />)}
      </div>
    </div>
  );
}

export function MenuSkeleton() {
  return (
    <div className="px-3 py-6 md:px-6" role="status" aria-label="Loading menu">
      <Skeleton className="h-8 w-28" />
      <div className="mt-4 flex gap-2">
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-9 w-28" />
        <Skeleton className="h-9 w-20" />
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 md:grid-cols-4 lg:grid-cols-6">
        {Array.from({ length: 6 }, (_, index) => <Skeleton key={index} className="aspect-[3/4] w-full" />)}
      </div>
    </div>
  );
}
