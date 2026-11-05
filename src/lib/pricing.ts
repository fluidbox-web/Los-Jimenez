import type { OrderTotals } from '../types/order';

export const calculateTotals = (
  quantity: number,
  unitPrice: number,
  shippingFee: number,
): OrderTotals => {
  const safeQuantity = Number.isFinite(quantity) ? Math.max(0, Math.floor(quantity)) : 0;
  const subtotal = safeQuantity * unitPrice;
  const shipping = safeQuantity > 0 ? shippingFee : 0;

  return {
    subtotal,
    shipping,
    total: subtotal + shipping,
  };
};

export const calculateChange = (cashAmount: number, total: number): number => {
  if (!Number.isFinite(cashAmount) || cashAmount < total) return 0;
  return Math.round(cashAmount - total);
};

export const formatMXN = (amount: number): string =>
  new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
  }).format(amount);
