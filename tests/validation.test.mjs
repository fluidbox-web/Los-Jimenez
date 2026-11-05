import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatPhone,
  isValidMexicanPhone,
  normalizePhone,
  validateCash,
  validateDelivery,
  validateQuantity,
} from '../src/lib/validation.ts';

const context = {
  zones: [
    { id: 'centro', name: 'Centro', enabled: true },
    { id: 'playacar', name: 'Playacar', enabled: true },
  ],
  deliveryWindows: {
    enabled: true,
    required: true,
    options: [
      { id: '13-14', label: '1:00 – 2:00 pm', enabled: true },
      { id: '14-15', label: '2:00 – 3:00 pm', enabled: true },
    ],
  },
};

const validCustomer = {
  name: '',
  phone: '9841234567',
  zoneId: 'centro',
  street: 'Av. 10 Norte 245',
  addressExtra: '',
  references: '',
  deliveryWindowId: '13-14',
};

test('acepta y normaliza números mexicanos de 10 dígitos', () => {
  assert.equal(normalizePhone('984 123 4567'), '9841234567');
  assert.equal(normalizePhone('+52 984 123 4567'), '9841234567');
  assert.equal(normalizePhone('+52 1 984 123 4567'), '9841234567');
  assert.equal(normalizePhone('(984) 123-4567'), '9841234567');
  assert.equal(isValidMexicanPhone('+52 984 123 4567'), true);
  assert.equal(isValidMexicanPhone('98412345'), false);
  assert.equal(formatPhone('9841234567'), '984 123 4567');
});

test('valida los datos de entrega completos', () => {
  assert.deepEqual(validateDelivery(validCustomer, context), {});
});

test('marca teléfono, colonia, calle y horario faltantes', () => {
  const errors = validateDelivery(
    {
      ...validCustomer,
      phone: '123',
      zoneId: '',
      street: '',
      deliveryWindowId: '',
    },
    context,
  );

  assert.ok(errors.phone);
  assert.ok(errors.zoneId);
  assert.ok(errors.street);
  assert.ok(errors.deliveryWindowId);
});

test('rechaza colonias no cubiertas', () => {
  const errors = validateDelivery({ ...validCustomer, zoneId: 'not-covered' }, context);
  assert.equal(errors.zoneId, 'Todavía no tenemos servicio en tu colonia.');
});

test('no exige horario cuando está deshabilitado', () => {
  const errors = validateDelivery(
    { ...validCustomer, deliveryWindowId: '' },
    {
      zones: context.zones,
      deliveryWindows: { enabled: false, required: true, options: context.deliveryWindows.options },
    },
  );
  assert.deepEqual(errors, {});
});

test('valida efectivo exacto, personalizado e insuficiente', () => {
  assert.equal(validateCash(null, 'exact', null, 290), 'Elige cómo vas a pagar.');
  assert.equal(validateCash('transfer', 'exact', null, 290), null);
  assert.equal(validateCash('cash', 'exact', null, 290), null);
  assert.equal(validateCash('cash', 'custom', null, 290), 'Escribe con cuánto vas a pagar.');
  assert.equal(validateCash('cash', 'custom', 200, 290), 'El efectivo debe cubrir al menos el total de $290.');
  assert.equal(validateCash('cash', 'custom', 500, 290), null);
});

test('valida la cantidad contra la disponibilidad', () => {
  assert.equal(validateQuantity(1, 12), null);
  assert.equal(validateQuantity(0, 12), 'Elige al menos un platillo.');
  assert.equal(validateQuantity(13, 12), 'Solo quedan 12 platillos disponibles.');
  assert.equal(validateQuantity(1, 0), 'El platillo de hoy ya se agotó.');
});
