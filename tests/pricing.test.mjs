import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateChange, calculateTotals, formatMXN } from '../src/lib/pricing.ts';

const unitPrice = 120;
const shippingFee = 50;

test('calcula los totales del ejemplo: 1, 2 y 3 platillos', () => {
  assert.deepEqual(calculateTotals(1, unitPrice, shippingFee), {
    subtotal: 120,
    shipping: 50,
    total: 170,
  });
  assert.deepEqual(calculateTotals(2, unitPrice, shippingFee), {
    subtotal: 240,
    shipping: 50,
    total: 290,
  });
  assert.deepEqual(calculateTotals(3, unitPrice, shippingFee), {
    subtotal: 360,
    shipping: 50,
    total: 410,
  });
});

test('el envío se cobra una sola vez sin importar la cantidad', () => {
  for (const quantity of [1, 4, 8, 12]) {
    const totals = calculateTotals(quantity, unitPrice, shippingFee);
    assert.equal(totals.shipping, shippingFee);
    assert.equal(totals.total, quantity * unitPrice + shippingFee);
  }
});

test('no cobra envío si no hay platillos', () => {
  assert.deepEqual(calculateTotals(0, unitPrice, shippingFee), {
    subtotal: 0,
    shipping: 0,
    total: 0,
  });
});

test('normaliza cantidades inválidas para no producir totales negativos', () => {
  assert.deepEqual(calculateTotals(-2, unitPrice, shippingFee), {
    subtotal: 0,
    shipping: 0,
    total: 0,
  });
  assert.deepEqual(calculateTotals(2.8, unitPrice, shippingFee), {
    subtotal: 240,
    shipping: 50,
    total: 290,
  });
});

test('calcula el cambio solo cuando el efectivo cubre el total', () => {
  assert.equal(calculateChange(500, 290), 210);
  assert.equal(calculateChange(290, 290), 0);
  assert.equal(calculateChange(200, 290), 0);
});

test('formatea precios en pesos mexicanos sin decimales', () => {
  assert.equal(formatMXN(170).replace(/\s/g, ''), '$170');
  assert.equal(formatMXN(410).replace(/\s/g, ''), '$410');
});
