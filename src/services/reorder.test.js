import test from 'node:test';
import assert from 'node:assert/strict';
import { planReorder } from './reorder.js';

const menu = {
  categories: [{
    id: 'ice',
    active: true,
    products: [{
      id: 'cone',
      name: 'Cone',
      available: true,
      price: 200,
      variants: [{ id: 'single', name: 'Single', price: 200 }, { id: 'double', name: 'Double', price: 300 }],
      addons: [{ id: 'flake', name: 'Flake', price: 50 }],
    }, {
      id: 'cup',
      name: 'Cup',
      available: false,
      price: 150,
    }],
  }],
};

test('reorder keeps the variant and current price', () => {
  const plan = planReorder(menu, [{ productId: 'cone', name: 'Cone', variantId: 'double', quantity: 2, unitPrice: 250, addons: [] }]);
  assert.equal(plan.lines.length, 1);
  assert.equal(plan.lines[0].unitPrice, 300);
  assert.equal(plan.lines[0].quantity, 2);
  assert.equal(plan.lines[0].variantName, 'Double');
  assert.equal(plan.skipped.length, 0);
  assert.match(plan.notes[0], /price/);
});

test('reorder skips unavailable products and missing variants', () => {
  const plan = planReorder(menu, [
    { productId: 'cup', name: 'Cup', quantity: 1 },
    { productId: 'cone', name: 'Cone', variantId: 'gone', quantity: 1 },
    { productId: 'missing', name: 'Old special', quantity: 1 },
  ]);
  assert.equal(plan.lines.length, 0);
  assert.equal(plan.skipped.length, 3);
});
