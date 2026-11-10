export function cashOnDeliveryEnabled(business) {
  return business?.cashOnDelivery === true;
}

export function checkoutPaymentError({ codEnabled, method, name, phone, reference, hasProof, dineInNeedsSeat, seatingNote }) {
  if (String(name || '').trim().length < 2 || String(phone || '').trim().length < 7) {
    return 'Enter your name and phone number.';
  }
  if (dineInNeedsSeat && String(seatingNote || '').trim().length < 3) {
    return 'Tell us your table number or where you are sitting so we can bring the order.';
  }
  const payingCash = codEnabled && method === 'cod';
  if (!payingCash && String(reference || '').trim().length < 3) {
    return 'Enter the payment reference.';
  }
  return '';
}
