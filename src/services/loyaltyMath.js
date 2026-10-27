export const loyaltyConfig = {
  earnRupeesPerPoint: 10,
  pointsPerRupeeDiscount: 1,
};

export function pointsForSpend(amount, config = loyaltyConfig) {
  const spent = Number(amount) || 0;
  const rate = Number(config.earnRupeesPerPoint) || loyaltyConfig.earnRupeesPerPoint;
  if (spent <= 0 || rate <= 0) return 0;
  return Math.floor(spent / rate);
}

export function discountForPoints(points, config = loyaltyConfig) {
  const count = Math.floor(Number(points) || 0);
  const rate = Number(config.pointsPerRupeeDiscount) || loyaltyConfig.pointsPerRupeeDiscount;
  if (count <= 0 || rate <= 0) return 0;
  return Math.floor(count / rate);
}

export function maxRedeemablePoints(balance, subtotal, config = loyaltyConfig) {
  const available = Math.max(0, Math.floor(Number(balance) || 0));
  const payable = Math.floor(Number(subtotal) || 0);
  const rate = Number(config.pointsPerRupeeDiscount) || loyaltyConfig.pointsPerRupeeDiscount;
  if (available <= 0 || payable <= 0 || rate <= 0) return 0;
  return Math.min(available, payable * rate);
}
