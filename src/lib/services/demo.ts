import { OrderError } from '../../types/order.ts';
import type {
  Availability,
  AvailabilityService,
  CreateOrderRequest,
  CreatedOrder,
  OrderService,
} from '../../types/order';

export type DemoScenario = 'normal' | 'soldout' | 'error' | 'changed';

interface DemoOptions {
  initialRemaining?: number;
  latencyMs?: number;
  scenario?: DemoScenario;
}

interface DemoServices {
  availability: AvailabilityService;
  orders: OrderService;
}

const buildDemoFolio = (): string => {
  const now = new Date();
  const stamp = [
    String(now.getFullYear()).slice(-2),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('');
  const random = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `DEMO-${stamp}-${random}`;
};

const wait = (milliseconds: number): Promise<void> =>
  milliseconds > 0
    ? new Promise((resolve) => globalThis.setTimeout(resolve, milliseconds))
    : Promise.resolve();

/**
 * Adaptador de demostración. Vive únicamente en memoria del navegador:
 * no crea pedidos reales, no contacta al CRM y no cobra pagos.
 *
 * La versión real deberá validar precio/disponibilidad y descontar stock
 * de forma atómica en el servidor.
 */
export const createDemoServices = ({
  initialRemaining = 12,
  latencyMs = 850,
  scenario = 'normal',
}: DemoOptions = {}): DemoServices => {
  let remaining = scenario === 'soldout' ? 0 : Math.max(0, Math.floor(initialRemaining));
  let changedApplied = false;

  const results = new Map<string, CreatedOrder>();
  const inFlight = new Map<string, Promise<CreatedOrder>>();

  const availability: AvailabilityService = {
    async getAvailability(): Promise<Availability> {
      await wait(Math.min(latencyMs, 250));
      return { remaining, isDemo: true };
    },
  };

  const orders: OrderService = {
    createOrder(request: CreateOrderRequest): Promise<CreatedOrder> {
      const existing = results.get(request.idempotencyKey);
      if (existing) return Promise.resolve(existing);

      const pending = inFlight.get(request.idempotencyKey);
      if (pending) return pending;

      const task = (async (): Promise<CreatedOrder> => {
        await wait(latencyMs);

        if (scenario === 'error') {
          throw new OrderError(
            'NETWORK',
            'No pudimos registrar el pedido. Intenta de nuevo en un momento.',
          );
        }

        if (scenario === 'changed' && !changedApplied) {
          changedApplied = true;
          remaining = Math.min(remaining, 2);
        }

        if (remaining <= 0) {
          throw new OrderError('SOLD_OUT', 'El platillo de hoy se agotó.', 0);
        }

        if (request.quantity < 1 || request.quantity > remaining) {
          throw new OrderError(
            'AVAILABILITY_CHANGED',
            'La disponibilidad cambió mientras completabas tu pedido.',
            remaining,
          );
        }

        if (request.payment.method === null) {
          throw new OrderError('VALIDATION', 'Falta elegir un método de pago.');
        }

        remaining -= request.quantity;

        const order: CreatedOrder = {
          folio: buildDemoFolio(),
          createdAt: new Date().toISOString(),
          status: request.payment.method === 'transfer' ? 'pending_transfer' : 'pay_on_delivery',
          isDemo: true,
          quantity: request.quantity,
          total: request.total,
          paymentMethod: request.payment.method,
        };

        results.set(request.idempotencyKey, order);
        return order;
      })();

      inFlight.set(request.idempotencyKey, task);
      void task.finally(() => inFlight.delete(request.idempotencyKey)).catch(() => undefined);

      return task;
    },
  };

  return { availability, orders };
};
