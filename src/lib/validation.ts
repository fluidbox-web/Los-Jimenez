import type { DeliveryWindow, OrderCustomer } from '../types/order';

export interface DeliveryValidationContext {
  zones: readonly { id: string; name: string; enabled: boolean }[];
  deliveryWindows: {
    enabled: boolean;
    required: boolean;
    options: readonly DeliveryWindow[];
  };
}

export type DeliveryErrors = Partial<
  Record<'phone' | 'zoneId' | 'street' | 'deliveryWindowId', string>
>;

/**
 * Acepta números mexicanos escritos de distintas formas:
 * 10 dígitos, +52, +52 1, espacios y guiones.
 */
export const normalizePhone = (raw: string): string => {
  let digits = raw.replace(/\D/g, '');

  if (digits.length === 13 && digits.startsWith('521')) digits = digits.slice(3);
  else if (digits.length === 12 && digits.startsWith('52')) digits = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith('1')) digits = digits.slice(1);

  return digits.slice(0, 10);
};

export const formatPhone = (raw: string): string => {
  const digits = normalizePhone(raw);
  if (digits.length !== 10) return digits;
  return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
};

export const isValidMexicanPhone = (raw: string): boolean =>
  normalizePhone(raw).length === 10;

export const validateDelivery = (
  customer: OrderCustomer,
  context: DeliveryValidationContext,
): DeliveryErrors => {
  const errors: DeliveryErrors = {};

  if (!customer.phone.trim()) {
    errors.phone = 'Escribe tu número de WhatsApp.';
  } else if (!isValidMexicanPhone(customer.phone)) {
    errors.phone = 'Escribe un número de WhatsApp de 10 dígitos.';
  }

  if (!customer.zoneId) {
    errors.zoneId = 'Elige tu colonia para calcular la entrega.';
  } else if (customer.zoneId === 'not-covered') {
    errors.zoneId = 'Todavía no tenemos servicio en tu colonia.';
  } else {
    const zone = context.zones.find((item) => item.id === customer.zoneId && item.enabled);
    if (!zone) errors.zoneId = 'Elige una colonia dentro de nuestra zona de servicio.';
  }

  if (!customer.street.trim()) {
    errors.street = 'Escribe tu calle y número.';
  } else if (customer.street.trim().length < 4) {
    errors.street = 'Agrega la calle y el número para ubicarte.';
  }

  if (context.deliveryWindows.enabled && context.deliveryWindows.required) {
    if (!customer.deliveryWindowId) {
      errors.deliveryWindowId = 'Elige un horario de entrega.';
    } else {
      const window = context.deliveryWindows.options.find(
        (item) => item.id === customer.deliveryWindowId && item.enabled,
      );
      if (!window) errors.deliveryWindowId = 'Elige un horario de entrega disponible.';
    }
  }

  return errors;
};

export const validateCash = (
  method: 'transfer' | 'cash' | null,
  cashMode: 'exact' | 'custom',
  cashAmount: number | null,
  total: number,
): string | null => {
  if (!method) return 'Elige cómo vas a pagar.';
  if (method === 'transfer') return null;
  if (cashMode === 'exact') return null;

  if (cashAmount === null || !Number.isFinite(cashAmount) || cashAmount <= 0) {
    return 'Escribe con cuánto vas a pagar.';
  }

  if (cashAmount < total) {
    return `El efectivo debe cubrir al menos el total de $${total}.`;
  }

  return null;
};

export const validateQuantity = (quantity: number, remaining: number): string | null => {
  if (remaining <= 0) return 'El platillo de hoy ya se agotó.';
  if (!Number.isInteger(quantity) || quantity < 1) return 'Elige al menos un platillo.';
  if (quantity > remaining) return `Solo quedan ${remaining} platillos disponibles.`;
  return null;
};
