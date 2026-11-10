import test from 'node:test';
import assert from 'node:assert/strict';
import { cashOnDeliveryEnabled, checkoutPaymentError } from './paymentChoice.js';

test('missing COD setting stays off', () => {
  assert.equal(cashOnDeliveryEnabled(undefined), false);
  assert.equal(cashOnDeliveryEnabled({}), false);
  assert.equal(cashOnDeliveryEnabled({ cashOnDelivery: false }), false);
  assert.equal(cashOnDeliveryEnabled({ cashOnDelivery: true }), true);
});

test('prepaid requires the reference and not a screenshot', () => {
  const missing = checkoutPaymentError({
    codEnabled: false,
    method: 'prepaid',
    name: 'Ali Khan',
    phone: '03001234567',
    reference: '',
    hasProof: false,
  });
  assert.match(missing, /payment reference/);
  const typed = checkoutPaymentError({
    codEnabled: false,
    method: 'prepaid',
    name: 'Ali Khan',
    phone: '03001234567',
    reference: 'ABC123',
    hasProof: false,
  });
  assert.equal(typed, '');
});

test('COD skips reference and receipt', () => {
  const error = checkoutPaymentError({
    codEnabled: true,
    method: 'cod',
    name: 'Ali Khan',
    phone: '03001234567',
    reference: '',
    hasProof: false,
  });
  assert.equal(error, '');
});

test('COD choice is ignored when the setting is off', () => {
  const error = checkoutPaymentError({
    codEnabled: false,
    method: 'cod',
    name: 'Ali Khan',
    phone: '03001234567',
    reference: '',
    hasProof: false,
  });
  assert.match(error, /payment reference/);
});
