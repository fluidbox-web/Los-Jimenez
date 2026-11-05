import test from 'node:test';
import assert from 'node:assert/strict';
import { createDemoServices } from '../src/lib/services/demo.ts';

const createRequest = (idempotencyKey, quantity = 1) => ({
  idempotencyKey,
  quantity,
  customer: {
    name: 'Ana',
    phone: '9841234567',
    zoneId: 'centro',
    street: 'Av. 10 Norte 245',
    addressExtra: '',
    references: '',
    deliveryWindowId: '13-14',
  },
  payment: { method: 'cash', cashMode: 'exact', cashAmount: quantity * 120 + 50 },
  subtotal: quantity * 120,
  shipping: 50,
  total: quantity * 120 + 50,
  promosOptIn: false,
});

test('registra un pedido demo y descuenta la disponibilidad una vez', async () => {
  const services = createDemoServices({ initialRemaining: 5, latencyMs: 0 });
  const result = await services.orders.createOrder(createRequest('key-1', 2));

  assert.match(result.folio, /^DEMO-/);
  assert.equal(result.isDemo, true);
  assert.equal(result.status, 'pay_on_delivery');
  assert.equal(result.total, 290);
  assert.equal((await services.availability.getAvailability()).remaining, 3);
});

test('la misma llave de idempotencia devuelve el mismo pedido', async () => {
  const services = createDemoServices({ initialRemaining: 5, latencyMs: 0 });
  const first = await services.orders.createOrder(createRequest('same-key', 2));
  const second = await services.orders.createOrder(createRequest('same-key', 2));

  assert.equal(second.folio, first.folio);
  assert.equal((await services.availability.getAvailability()).remaining, 3);
});

test('dos solicitudes concurrentes con la misma llave no duplican el pedido', async () => {
  const services = createDemoServices({ initialRemaining: 5, latencyMs: 0 });
  const [first, second] = await Promise.all([
    services.orders.createOrder(createRequest('parallel-key', 2)),
    services.orders.createOrder(createRequest('parallel-key', 2)),
  ]);

  assert.equal(second.folio, first.folio);
  assert.equal((await services.availability.getAvailability()).remaining, 3);
});

test('rechaza cantidades mayores a la disponibilidad', async () => {
  const services = createDemoServices({ initialRemaining: 2, latencyMs: 0 });

  await assert.rejects(
    () => services.orders.createOrder(createRequest('too-many', 3)),
    (error) => error.code === 'AVAILABILITY_CHANGED' && error.remaining === 2,
  );
  assert.equal((await services.availability.getAvailability()).remaining, 2);
});

test('expone el estado agotado', async () => {
  const services = createDemoServices({ initialRemaining: 5, latencyMs: 0, scenario: 'soldout' });

  assert.equal((await services.availability.getAvailability()).remaining, 0);
  await assert.rejects(
    () => services.orders.createOrder(createRequest('soldout-key', 1)),
    (error) => error.code === 'SOLD_OUT' && error.remaining === 0,
  );
});

test('permite probar el estado de error de red', async () => {
  const services = createDemoServices({ initialRemaining: 5, latencyMs: 0, scenario: 'error' });
  await assert.rejects(
    () => services.orders.createOrder(createRequest('network-key', 1)),
    (error) => error.code === 'NETWORK',
  );
});

test('simula un cambio de disponibilidad antes de confirmar', async () => {
  const services = createDemoServices({ initialRemaining: 5, latencyMs: 0, scenario: 'changed' });

  await assert.rejects(
    () => services.orders.createOrder(createRequest('changed-key', 3)),
    (error) => error.code === 'AVAILABILITY_CHANGED' && error.remaining === 2,
  );

  const result = await services.orders.createOrder(createRequest('changed-key-2', 2));
  assert.equal(result.isDemo, true);
  assert.equal((await services.availability.getAvailability()).remaining, 0);
});

test('una transferencia queda pendiente, no pagada', async () => {
  const services = createDemoServices({ initialRemaining: 5, latencyMs: 0 });
  const request = createRequest('transfer-key', 1);
  request.payment = { method: 'transfer', cashMode: 'exact', cashAmount: 170 };

  const result = await services.orders.createOrder(request);
  assert.equal(result.status, 'pending_transfer');
});
