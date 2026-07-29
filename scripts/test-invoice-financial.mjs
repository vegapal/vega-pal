import assert from "node:assert/strict";

function roundMoney(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function clampPercent(value) {
  if (!Number.isFinite(value) || value < 0) return 0;
  if (value > 100) return 100;
  return value;
}

function computeFinancialTotals(input) {
  const subtotal = roundMoney(
    input.items.reduce(
      (sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0),
      0,
    ),
  );

  let discountAmount = 0;
  if (input.discountType === "percentage") {
    const rate = clampPercent(input.discountRate ?? 0);
    discountAmount = roundMoney(subtotal * (rate / 100));
  } else {
    discountAmount = roundMoney(Math.max(0, input.discountAmount));
  }

  const taxableBase = roundMoney(Math.max(0, subtotal - discountAmount));

  let taxAmount = 0;
  if (input.taxType === "percentage") {
    const rate = clampPercent(input.taxRate ?? 0);
    taxAmount = roundMoney(taxableBase * (rate / 100));
  } else {
    taxAmount = roundMoney(Math.max(0, input.taxAmount));
  }

  const total = roundMoney(Math.max(0, taxableBase + taxAmount));
  return { subtotal, discountAmount, taxableBase, taxAmount, total };
}

const items = [{ quantity: 1, unitPrice: 100 }];

const case1 = computeFinancialTotals({
  items,
  discountType: "percentage",
  taxType: "percentage",
  discountAmount: 0,
  taxAmount: 0,
  discountRate: 10,
  taxRate: 5,
});
assert.equal(case1.subtotal, 100);
assert.equal(case1.discountAmount, 10);
assert.equal(case1.taxableBase, 90);
assert.equal(case1.taxAmount, 4.5);
assert.equal(case1.total, 94.5);

const legacy = computeFinancialTotals({
  items,
  discountType: "fixed",
  taxType: "fixed",
  discountAmount: 15,
  taxAmount: 5,
  discountRate: 0,
  taxRate: 0,
});
assert.equal(legacy.total, roundMoney(100 - 15 + 5));

assert.equal(clampPercent(-1), 0);
assert.equal(clampPercent(150), 100);

console.log("test-invoice-financial: ok");
