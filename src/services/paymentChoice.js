export function cashOnDeliveryEnabled(business) {
  return business?.cashOnDelivery === true;
}

export function phoneDigits(value) {
  return String(value || '').replace(/\D/g, '').slice(0, 11);
}

export function validPakPhone(value) {
  return /^03\d{9}$/.test(phoneDigits(value));
}

export function checkoutPaymentError({ codEnabled, method, name, phone, reference, hasProof, dineInNeedsSeat, seatingNote }) {
  if (String(name || '').trim().length < 2) {
    return 'Enter your name.';
  }
  if (!validPakPhone(phone)) {
    return 'Enter an 11-digit phone number starting with 03.';
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
