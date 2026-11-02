export function PaymentDetails({ business, className = '' }) {
  const qr = String(business?.paymentQrUrl || '').trim();
  if (!business) return null;
  return (
    <div className={`rounded-3xl bg-white p-4 ${className}`.trim()}>
      <p className="font-semibold">{business.paymentInstructions || 'Pay first'}</p>
      <p className="mt-2 text-lg font-bold">{business.paymentAccountNumber}</p>
      <p className="text-sm">{business.paymentAccountName}</p>
      {qr ? (
        <div className="mt-4">
          <p className="text-sm font-semibold text-stone-700">Scan to pay</p>
          <p className="mt-1 text-sm text-stone-500">Open your JazzCash or EasyPaisa app and scan this QR.</p>
          <div className="mt-3 overflow-hidden rounded-2xl border border-stone-200 bg-stone-50 p-3">
            <img src={qr} alt="Payment QR code" className="mx-auto max-h-56 w-full object-contain" />
          </div>
        </div>
      ) : null}
    </div>
  );
}
