import test from 'node:test';
import assert from 'node:assert/strict';
import { discountForPoints, maxRedeemablePoints, pointsForSpend } from './loyaltyMath.js';

test('earning uses whole points from the paid amount', () => {
  assert.equal(pointsForSpend(2500), 250);
  assert.equal(pointsForSpend(500), 50);
  assert.equal(pointsForSpend(1000), 100);
  assert.equal(pointsForSpend(255), 25);
  assert.equal(pointsForSpend(259), 25);
  assert.equal(pointsForSpend(260), 26);
  assert.equal(pointsForSpend(0), 0);
});

test('redemption converts points to rupees', () => {
  assert.equal(discountForPoints(500), 500);
  assert.equal(discountForPoints(100), 100);
  assert.equal(discountForPoints(0), 0);
});

test('a customer cannot redeem more than the balance or the bill', () => {
  assert.equal(maxRedeemablePoints(0, 2500), 0);
  assert.equal(maxRedeemablePoints(940, 200), 200);
  assert.equal(maxRedeemablePoints(350, 100), 100);
  assert.equal(maxRedeemablePoints(40, 2500), 40);
});
