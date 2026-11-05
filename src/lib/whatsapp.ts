import type { PaymentMethod } from '../types/order';
import { formatMXN } from './pricing';

interface WhatsAppMessageInput {
  isDemo: boolean;
  folio: string;
  dishName: string;
  quantity: number;
  total: number;
  paymentMethod: PaymentMethod;
}

/**
 * Mensaje breve para iniciar la conversación.
 * Deliberadamente NO incluye la dirección completa.
 */
export const buildWhatsAppMessage = ({
  isDemo,
  folio,
  dishName,
  quantity,
  total,
  paymentMethod,
}: WhatsAppMessageInput): string => {
  const payment =
    paymentMethod === 'transfer' ? 'Transferencia bancaria (pendiente)' : 'Efectivo al recibir';

  return [
    isDemo ? '[DEMO] Pedido de prueba' : 'Hola, acabo de hacer un pedido.',
    `Folio: ${folio}`,
    `${quantity} × ${dishName}`,
    `Total: ${formatMXN(total)}`,
    `Pago: ${payment}`,
    '',
    'Te comparto mi ubicación por aquí.',
  ].join('\n');
};

export const buildWhatsAppUrl = (number: string, message: string): string | null => {
  const digits = number.replace(/\D/g, '');
  if (!digits) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
};
