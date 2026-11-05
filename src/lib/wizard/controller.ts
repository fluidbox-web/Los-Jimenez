import { business } from '../../config/business';
import { calculateChange, calculateTotals, formatMXN } from '../pricing';
import {
  formatPhone,
  normalizePhone,
  validateCash,
  validateDelivery,
  validateQuantity,
} from '../validation';
import type { DeliveryErrors } from '../validation';
import { buildWhatsAppMessage, buildWhatsAppUrl } from '../whatsapp';
import { createDemoServices } from '../services/demo';
import type { DemoScenario } from '../services/demo';
import { OrderError } from '../../types/order';
import type {
  CashMode,
  CreatedOrder,
  OrderCustomer,
  OrderTotals,
  PaymentMethod,
  PaymentSelection,
} from '../../types/order';

type WizardStep = 1 | 2 | 3 | 4 | 5 | 6;
type EditableStep = 2 | 3 | 4;

const STEP_LABELS: Record<number, string> = {
  1: 'Platillo',
  2: 'Cantidad',
  3: 'Entrega',
  4: 'Pago',
  5: 'Resumen',
  6: 'Confirmación',
};

const FALLBACK_ORDER_ERROR =
  'No pudimos registrar tu pedido. Revisa tu conexión e intenta de nuevo.';

const SAVED_ADDRESSES_KEY = 'los-jimenez-saved-addresses-v1';
const MAX_SAVED_ADDRESSES = 3;

interface SavedAddress {
  id: string;
  name: string;
  phone: string;
  zoneId: string;
  street: string;
  addressExtra: string;
  references: string;
  savedAt: string;
}

interface WizardState {
  step: WizardStep;
  quantity: number;
  totals: OrderTotals;
  customer: OrderCustomer;
  payment: PaymentSelection;
  promosOptIn: boolean;
  saveAddress: boolean;
  remaining: number;
  editingFromReview: boolean;
  submitting: boolean;
  idempotencyKey: string | null;
  order: CreatedOrder | null;
}

const emptyCustomer = (): OrderCustomer => ({
  name: '',
  phone: '',
  zoneId: '',
  street: '',
  addressExtra: '',
  references: '',
  deliveryWindowId: '',
});

const emptyPayment = (): PaymentSelection => ({
  method: null,
  cashMode: 'exact',
  cashAmount: null,
});

const createIdempotencyKey = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `pedido-${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

export const initWizard = (): void => {
  const root = document.querySelector<HTMLElement>('[data-wizard]');
  if (!root) return;

  const must = <T extends Element>(selector: string, parent: ParentNode = root): T => {
    const element = parent.querySelector<T>(selector);
    if (!element) throw new Error(`No se encontró el elemento: ${selector}`);
    return element;
  };

  const setAllText = (selector: string, text: string): void => {
    root.querySelectorAll<HTMLElement>(selector).forEach((element) => {
      element.textContent = text;
    });
  };

  const announce = (message: string): void => {
    const region = must<HTMLElement>('[data-live-region]');
    region.textContent = '';
    globalThis.setTimeout(() => {
      region.textContent = message;
    }, 30);
  };

  const dishPanel = must<HTMLElement>('[data-step-panel="1"]');
  const successPanel = must<HTMLElement>('[data-step-panel="6"]');
  const orderShell = must<HTMLElement>('[data-order-shell]');
  const stepPanels = Array.from(root.querySelectorAll<HTMLElement>('[data-step-panel]'));
  const progress = must<HTMLElement>('[data-progress]');
  const progressItems = Array.from(root.querySelectorAll<HTMLElement>('[data-progress-item]'));
  const stepNumber = must<HTMLElement>('[data-step-number]');
  const stepName = must<HTMLElement>('[data-step-name]');

  const dishActionBlocks = Array.from(root.querySelectorAll<HTMLElement>('[data-dish-actions]'));
  const dishSoldout = must<HTMLElement>('[data-dish-soldout]');
  const dishSoldoutBadge = must<HTMLElement>('[data-dish-soldout-badge]');
  const quantityContent = must<HTMLElement>('[data-quantity-content]');
  const quantitySoldout = must<HTMLElement>('[data-quantity-soldout]');
  const qtyDec = must<HTMLButtonElement>('[data-qty-dec]');
  const qtyInc = must<HTMLButtonElement>('[data-qty-inc]');
  const qtyOutput = must<HTMLElement>('[data-quantity]');
  const availabilityText = must<HTMLElement>('[data-availability-text]');
  const quantityError = must<HTMLElement>('[data-error-for="quantity"]');

  const deliveryForm = must<HTMLElement>('[data-delivery-form]');
  const phoneInput = must<HTMLInputElement>('#customer-phone');
  const phoneShell = must<HTMLElement>('[data-phone-shell]');
  const zoneSelect = must<HTMLSelectElement>('#customer-zone');
  const zoneNote = must<HTMLElement>('[data-zone-note]');
  const zoneNoteText = must<HTMLElement>('[data-zone-note-text]');
  const streetInput = must<HTMLInputElement>('#customer-street');
  const windowSelect = root.querySelector<HTMLSelectElement>('#delivery-window');
  const savedAddressesPanel = must<HTMLElement>('[data-saved-addresses]');
  const savedAddressList = must<HTMLElement>('[data-saved-address-list]');
  const saveAddressWrap = must<HTMLElement>('[data-save-address-wrap]');
  const saveAddressCheckbox = must<HTMLInputElement>('[data-save-address]');

  const paymentForm = must<HTMLElement>('[data-payment-form]');
  const transferDetails = must<HTMLElement>('[data-transfer-details]');
  const cashDetails = must<HTMLElement>('[data-cash-details]');
  const cashCustom = must<HTMLElement>('[data-cash-custom]');
  const cashAmountInput = must<HTMLInputElement>('#cash-amount');
  const cashChange = must<HTMLElement>('[data-cash-change]');
  const paymentError = must<HTMLElement>('[data-error-for="payment"]');
  const cashError = must<HTMLElement>('[data-error-for="cash"]');

  const actionBar = must<HTMLElement>('[data-action-bar]');
  const primaryButton = must<HTMLButtonElement>('[data-action-bar] [data-primary]');
  const primaryLabel = must<HTMLElement>('[data-primary-label]', actionBar);
  const primarySpinner = must<HTMLElement>('[data-primary-spinner]', actionBar);
  const primaryIcon = must<HTMLElement>('[data-primary-icon]', actionBar);
  const promotions = must<HTMLInputElement>('[data-promotions]');
  const submitError = must<HTMLElement>('[data-submit-error]');
  const submitErrorText = must<HTMLElement>('[data-submit-error-text]');

  const whatsappButton = must<HTMLAnchorElement>('[data-whatsapp-button]');
  const whatsappNote = must<HTMLElement>('[data-whatsapp-note]');
  const demoBanner = must<HTMLElement>('[data-demo-banner]');
  const bankCard = must<HTMLElement>('[data-bank-card]');
  const bankDetails = must<HTMLElement>('[data-bank-details]');
  const bankMissing = must<HTMLElement>('[data-bank-missing]');

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  const demoParam = new URLSearchParams(window.location.search).get('demo');
  const scenario: DemoScenario =
    business.demoMode && (demoParam === 'soldout' || demoParam === 'error' || demoParam === 'changed')
      ? demoParam
      : 'normal';

  const services = createDemoServices({
    initialRemaining: business.availability.remaining,
    scenario,
  });

  const state: WizardState = {
    step: 1,
    quantity: 1,
    totals: calculateTotals(
      1,
      business.pricing.unitPrice,
      business.pricing.shippingFee,
    ),
    customer: emptyCustomer(),
    payment: emptyPayment(),
    promosOptIn: false,
    saveAddress: false,
    remaining: business.availability.remaining,
    editingFromReview: false,
    submitting: false,
    idempotencyKey: null,
    order: null,
  };

  const zoneOptions: { id: string; name: string; estimate: string | null; enabled: boolean }[] =
    business.coverage.zones.filter((zone) => zone.enabled);
  const windowOptions = business.deliveryWindows.options.filter((window) => window.enabled);

  const getZone = (zoneId: string) => zoneOptions.find((zone) => zone.id === zoneId);

  const getWindow = (windowId: string) =>
    windowOptions.find((window) => window.id === windowId);

  const storageAvailable = (() => {
    try {
      const testKey = '__los_jimenez_storage_test__';
      localStorage.setItem(testKey, '1');
      localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  })();

  let savedAddresses: SavedAddress[] = [];

  const addressSignature = (address: SavedAddress): string =>
    [address.phone, address.zoneId, address.street, address.addressExtra]
      .join('|')
      .trim()
      .toLowerCase();

  const readSavedAddresses = (): SavedAddress[] => {
    if (!storageAvailable) return [];

    try {
      const raw = localStorage.getItem(SAVED_ADDRESSES_KEY);
      if (!raw) return [];
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];

      return parsed
        .filter((item): item is SavedAddress => {
          if (!item || typeof item !== 'object') return false;
          const address = item as Partial<SavedAddress>;
          return (
            typeof address.id === 'string' &&
            typeof address.name === 'string' &&
            typeof address.phone === 'string' &&
            normalizePhone(address.phone).length === 10 &&
            typeof address.zoneId === 'string' &&
            Boolean(getZone(address.zoneId)) &&
            typeof address.street === 'string' &&
            address.street.trim().length > 0 &&
            typeof address.addressExtra === 'string' &&
            typeof address.references === 'string' &&
            typeof address.savedAt === 'string'
          );
        })
        .slice(0, MAX_SAVED_ADDRESSES);
    } catch {
      return [];
    }
  };

  const writeSavedAddresses = (addresses: SavedAddress[]): void => {
    if (!storageAvailable) return;
    try {
      localStorage.setItem(SAVED_ADDRESSES_KEY, JSON.stringify(addresses));
    } catch {
      // Si el navegador bloquea el almacenamiento, la función simplemente no persiste.
    }
  };

  const renderSavedAddresses = (): void => {
    if (!storageAvailable) {
      savedAddressesPanel.hidden = true;
      saveAddressWrap.hidden = true;
      return;
    }

    savedAddresses = readSavedAddresses();
    savedAddressesPanel.hidden = savedAddresses.length === 0;
    savedAddressList.replaceChildren();

    savedAddresses.forEach((address) => {
      const zone = getZone(address.zoneId);
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.useAddress = address.id;
      button.className =
        'flex min-h-11 w-full items-center justify-between gap-3 rounded-xl border border-line bg-cream/40 px-3.5 py-2.5 text-left transition hover:border-brand/40 hover:bg-cream/70';

      const content = document.createElement('span');
      content.className = 'min-w-0';

      const title = document.createElement('span');
      title.className = 'block truncate text-xs font-semibold text-ink';
      title.textContent = address.street;

      const meta = document.createElement('span');
      meta.className = 'mt-0.5 block truncate text-[10px] text-ink-muted';
      meta.textContent = [address.name, zone?.name].filter(Boolean).join(' · ');

      content.append(title, meta);

      const action = document.createElement('span');
      action.className = 'shrink-0 text-[10px] font-semibold text-brand';
      action.textContent = 'Usar';

      button.append(content, action);
      savedAddressList.append(button);
    });
  };

  const applySavedAddress = (id: string): void => {
    const address = savedAddresses.find((item) => item.id === id);
    if (!address) return;

    const setValue = (name: string, value: string): void => {
      const field = deliveryForm.querySelector<HTMLInputElement | HTMLSelectElement>(
        `[name="${name}"]`,
      );
      if (field) field.value = value;
    };

    setValue('name', address.name);
    setValue('phone', formatPhone(address.phone));
    setValue('zoneId', address.zoneId);
    setValue('street', address.street);
    setValue('addressExtra', address.addressExtra);
    setValue('references', address.references);

    clearDeliveryErrors();
    updateZoneNote();
    markDirty();
    announce('Dirección anterior aplicada. Revisa los datos y continúa.');
  };

  const forgetSavedAddresses = (): void => {
    if (!storageAvailable) return;
    try {
      localStorage.removeItem(SAVED_ADDRESSES_KEY);
    } catch {
      // Sin almacenamiento disponible no hay nada que borrar.
    }
    savedAddresses = [];
    renderSavedAddresses();
    announce('Se eliminaron las direcciones guardadas de este dispositivo.');
  };

  const saveCurrentAddress = (): void => {
    if (!state.saveAddress || !storageAvailable) return;

    const customer = state.customer;
    if (!customer.phone || !customer.zoneId || !customer.street) return;

    const entry: SavedAddress = {
      id: createIdempotencyKey(),
      name: customer.name,
      phone: customer.phone,
      zoneId: customer.zoneId,
      street: customer.street,
      addressExtra: customer.addressExtra,
      references: customer.references,
      savedAt: new Date().toISOString(),
    };

    const signature = addressSignature(entry);
    const next = [
      entry,
      ...readSavedAddresses().filter((address) => addressSignature(address) !== signature),
    ].slice(0, MAX_SAVED_ADDRESSES);

    writeSavedAddresses(next);
    state.saveAddress = false;
    saveAddressCheckbox.checked = false;
    renderSavedAddresses();
  };

  const readField = (name: string): string => {
    const field = deliveryForm.querySelector<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
      `[name="${name}"]`,
    );
    return field?.value.trim() ?? '';
  };

  const getSelectedPaymentMethod = (): PaymentMethod | null => {
    const selected = paymentForm.querySelector<HTMLInputElement>(
      'input[name="paymentMethod"]:checked',
    );
    if (selected?.value === 'transfer') return 'transfer';
    if (selected?.value === 'cash') return 'cash';
    return null;
  };

  const getCashMode = (): CashMode => {
    const selected = paymentForm.querySelector<HTMLInputElement>(
      'input[name="cashMode"]:checked',
    );
    return selected?.value === 'custom' ? 'custom' : 'exact';
  };

  const readCashAmount = (): number | null => {
    const digits = cashAmountInput.value.replace(/\D/g, '');
    if (!digits) return null;
    const amount = Number(digits);
    return Number.isFinite(amount) ? amount : null;
  };

  const buildScheduleDetail = (): string => {
    const zone = getZone(state.customer.zoneId);
    const window = getWindow(state.customer.deliveryWindowId);
    const parts: string[] = [];
    if (window) parts.push(`Horario: ${window.label}`);
    if (zone?.estimate) parts.push(`Tiempo estimado: ${zone.estimate}`);
    return parts.length ? parts.join(' · ') : 'Horario de entrega por confirmar.';
  };

  const buildAddress = (): string => {
    const zone = getZone(state.customer.zoneId);
    const lines = [
      state.customer.street,
      state.customer.addressExtra,
      zone ? `${zone.name}, ${business.brand.city}` : business.brand.city,
    ].filter(Boolean);
    return lines.join(', ');
  };

  const getCashSummary = (): { label: string; detail: string } => {
    if (!state.payment.method) return { label: 'Sin elegir', detail: '' };
    if (state.payment.method === 'transfer') {
      return {
        label: 'Transferencia bancaria',
        detail: 'El pago queda pendiente de verificación.',
      };
    }

    if (state.payment.cashMode === 'exact') {
      return {
        label: 'Efectivo',
        detail: `Importe exacto: ${formatMXN(state.totals.total)}.`,
      };
    }

    const amount = state.payment.cashAmount;
    if (amount === null) return { label: 'Efectivo', detail: 'Cantidad por confirmar.' };

    if (amount < state.totals.total) {
      return {
        label: 'Efectivo',
        detail: `El monto no cubre el total de ${formatMXN(state.totals.total)}.`,
      };
    }

    const change = calculateChange(amount, state.totals.total);
    return {
      label: 'Efectivo',
      detail:
        change > 0
          ? `Pagas con ${formatMXN(amount)} · Cambio: ${formatMXN(change)}.`
          : `Pagas con ${formatMXN(amount)}, sin cambio.`,
    };
  };

  const updateQuantityUI = (): void => {
    const soldOut = state.remaining <= 0;

    qtyOutput.textContent = String(state.quantity);
    qtyDec.disabled = state.submitting || soldOut || state.quantity <= 1;
    qtyInc.disabled = state.submitting || soldOut || state.quantity >= state.remaining;

    setAllText('[data-summary-quantity]', String(state.quantity));
    setAllText('[data-summary-word]', state.quantity === 1 ? 'platillo' : 'platillos');
    setAllText('[data-remaining]', String(state.remaining));

    availabilityText.textContent = soldOut
      ? 'No quedan platillos para hoy'
      : state.remaining === 1
        ? 'Queda 1 platillo para hoy'
        : `Quedan ${state.remaining} platillos para hoy`;

    dishActionBlocks.forEach((block) => {
      block.hidden = soldOut;
    });
    dishSoldout.hidden = !soldOut;
    dishSoldoutBadge.hidden = !soldOut;
    quantityContent.hidden = soldOut;
    quantitySoldout.hidden = !soldOut;
  };

  const updateActionBar = (): void => {
    const visible = state.step >= 2 && state.step <= 5;
    actionBar.hidden = !visible;

    const hasMobileAction = (state.step === 1 && state.remaining > 0) || visible;
    root.classList.toggle('has-action-bar', hasMobileAction);

    let label = 'Continuar';
    if (state.remaining <= 0) label = 'Agotado por hoy';
    if (state.step === 5) label = `Confirmar pedido · ${formatMXN(state.totals.total)}`;
    if (state.editingFromReview && state.step < 5) label = 'Guardar cambios';
    if (state.submitting) label = 'Procesando pedido…';

    primaryLabel.textContent = label;
    primaryButton.disabled = state.submitting || state.remaining <= 0;
    primaryButton.setAttribute('aria-busy', String(state.submitting));
    primarySpinner.hidden = !state.submitting;
    primaryIcon.hidden = state.submitting;
  };

  const updateProgress = (): void => {
    const visibleStep = Math.min(state.step, 5);
    stepNumber.textContent = String(visibleStep);
    stepName.textContent = STEP_LABELS[visibleStep] ?? '';

    progressItems.forEach((item, index) => {
      const itemStep = index + 1;
      item.dataset.state =
        itemStep < state.step ? 'complete' : itemStep === state.step ? 'current' : 'upcoming';
      if (itemStep === state.step) item.setAttribute('aria-current', 'step');
      else item.removeAttribute('aria-current');
    });
  };

  const focusStep = (step: WizardStep): void => {
    const panel = root.querySelector<HTMLElement>(`[data-step-panel="${step}"]`);
    const heading = panel?.querySelector<HTMLElement>('[data-step-heading]');
    const anchor = step === 6 ? successPanel : progress;
    const top = anchor.getBoundingClientRect().top + window.scrollY - 16;

    heading?.focus({ preventScroll: true });
    window.scrollTo({
      top: Math.max(0, top),
      behavior: prefersReducedMotion.matches ? 'auto' : 'smooth',
    });
  };

  const goToStep = (step: WizardStep, options: { focus?: boolean; announce?: boolean } = {}): void => {
    state.step = step;
    const showShell = step >= 2 && step <= 5;

    dishPanel.hidden = step !== 1;
    orderShell.hidden = !showShell;
    successPanel.hidden = step !== 6;
    progress.hidden = step === 6;
    document.documentElement.classList.remove('keyboard-open');

    stepPanels.forEach((panel) => {
      panel.hidden = Number(panel.dataset.stepPanel) !== step;
    });

    if (step === 5) {
      clearSubmitError();
      renderReview();
    }
    if (step === 2) updateQuantityUI();
    if (step === 3) updateZoneNote();
    if (step === 4) updatePaymentUI();

    updateProgress();
    updateActionBar();

    if (options.focus !== false) {
      focusStep(step);
      if (options.announce !== false) {
        announce(`Paso ${Math.min(step, 5)} de 5: ${STEP_LABELS[step]}`);
      }
    }
  };

  const clearQuantityError = (): void => {
    quantityError.hidden = true;
    quantityError.textContent = '';
  };

  const showQuantityError = (message: string): void => {
    quantityError.textContent = message;
    quantityError.hidden = false;
    announce(message);
  };

  const clearSubmitError = (): void => {
    submitError.hidden = true;
    submitErrorText.textContent = '';
  };

  const showSubmitError = (message: string): void => {
    submitErrorText.textContent = message;
    submitError.hidden = false;
    submitError.focus();
    announce(message);
  };

  const updateZoneNote = (): void => {
    const value = zoneSelect.value;

    if (!value) {
      zoneNote.hidden = true;
      zoneNoteText.textContent = '';
      return;
    }

    if (value === 'not-covered') {
      zoneNote.hidden = false;
      zoneNoteText.textContent = business.coverage.notCoveredMessage;
      return;
    }

    const zone = getZone(value);
    if (!zone) {
      zoneNote.hidden = true;
      zoneNoteText.textContent = '';
      return;
    }

    zoneNote.hidden = false;
    zoneNoteText.textContent = zone.estimate
      ? `Tiempo estimado para ${zone.name}: ${zone.estimate}.`
      : `Tiempo de entrega para ${zone.name}: por confirmar.`;
  };

  const clearDeliveryError = (name: string): void => {
    const error = deliveryForm.querySelector<HTMLElement>(`[data-error-for="${name}"]`);
    if (error) {
      error.hidden = true;
      error.textContent = '';
    }
    const field = deliveryForm.querySelector<HTMLElement>(`[name="${name}"]`);
    field?.removeAttribute('aria-invalid');
    if (name === 'phone') phoneShell.removeAttribute('aria-invalid');
  };

  const clearDeliveryErrors = (): void => {
    ['phone', 'zoneId', 'street', 'deliveryWindowId'].forEach(clearDeliveryError);
  };

  const showDeliveryErrors = (errors: DeliveryErrors): void => {
    clearDeliveryErrors();

    const focusOrder: (keyof DeliveryErrors)[] = [
      'phone',
      'zoneId',
      'street',
      'deliveryWindowId',
    ];
    const fieldMap: Partial<Record<keyof DeliveryErrors, HTMLElement | null>> = {
      phone: phoneInput,
      zoneId: zoneSelect,
      street: streetInput,
      deliveryWindowId: windowSelect,
    };

    let firstInvalid: HTMLElement | null = null;

    for (const field of focusOrder) {
      const message = errors[field];
      if (!message) continue;

      const error = deliveryForm.querySelector<HTMLElement>(`[data-error-for="${field}"]`);
      if (error) {
        error.textContent = message;
        error.hidden = false;
      }

      const input = fieldMap[field];
      input?.setAttribute('aria-invalid', 'true');
      if (field === 'phone') phoneShell.setAttribute('aria-invalid', 'true');
      if (!firstInvalid && input) firstInvalid = input;
    }

    announce('Revisa los campos marcados antes de continuar.');
    firstInvalid?.focus();
  };

  const collectCustomer = (): OrderCustomer => ({
    name: readField('name'),
    phone: normalizePhone(readField('phone')),
    zoneId: readField('zoneId'),
    street: readField('street'),
    addressExtra: readField('addressExtra'),
    references: readField('references'),
    deliveryWindowId: business.deliveryWindows.enabled ? readField('deliveryWindowId') : '',
  });

  const validateAndSaveDelivery = (): boolean => {
    const customer = collectCustomer();
    const errors = validateDelivery(customer, {
      zones: zoneOptions,
      deliveryWindows: business.deliveryWindows,
    });

    if (customer.zoneId === 'not-covered') {
      errors.zoneId = business.coverage.notCoveredMessage;
    }

    if (Object.keys(errors).length > 0) {
      showDeliveryErrors(errors);
      return false;
    }

    state.customer = customer;
    phoneInput.value = formatPhone(customer.phone);
    return true;
  };

  const updateCashPreview = (): void => {
    const method = getSelectedPaymentMethod();
    const mode = getCashMode();

    if (method !== 'cash' || mode !== 'custom') {
      cashChange.hidden = true;
      return;
    }

    const amount = readCashAmount();
    if (amount === null) {
      cashChange.hidden = true;
      return;
    }

    const enough = amount >= state.totals.total;
    const difference = enough
      ? calculateChange(amount, state.totals.total)
      : state.totals.total - amount;

    cashChange.hidden = false;
    cashChange.textContent = enough
      ? `Tu cambio: ${formatMXN(difference)}`
      : `Faltan ${formatMXN(difference)} para cubrir el total.`;
    cashChange.classList.toggle('text-success', enough);
    cashChange.classList.toggle('text-brand-dark', !enough);
  };

  const updatePaymentUI = (): void => {
    const method = getSelectedPaymentMethod();
    const mode = getCashMode();

    transferDetails.hidden = method !== 'transfer';
    cashDetails.hidden = method !== 'cash';
    cashCustom.hidden = !(method === 'cash' && mode === 'custom');
    setAllText('[data-cash-total]', formatMXN(state.totals.total));
    updateCashPreview();
  };

  const clearPaymentErrors = (): void => {
    paymentError.hidden = true;
    paymentError.textContent = '';
    cashError.hidden = true;
    cashError.textContent = '';
    cashAmountInput.removeAttribute('aria-invalid');
  };

  const showPaymentError = (message: string): void => {
    const method = getSelectedPaymentMethod();

    if (!method) {
      paymentError.textContent = message;
      paymentError.hidden = false;
      paymentForm.querySelector<HTMLInputElement>('input[name="paymentMethod"]')?.focus();
    } else {
      cashError.textContent = message;
      cashError.hidden = false;
      cashAmountInput.setAttribute('aria-invalid', 'true');
      cashAmountInput.focus();
    }

    announce(message);
  };

  const collectPayment = (): PaymentSelection => {
    const method = getSelectedPaymentMethod();
    const cashMode = getCashMode();
    let cashAmount: number | null = null;

    if (method === 'cash') {
      cashAmount = cashMode === 'exact' ? state.totals.total : readCashAmount();
    }

    return { method, cashMode, cashAmount };
  };

  const validateAndSavePayment = (): boolean => {
    clearPaymentErrors();
    const payment = collectPayment();
    const error = validateCash(
      payment.method,
      payment.cashMode,
      payment.cashAmount,
      state.totals.total,
    );

    if (error) {
      showPaymentError(error);
      return false;
    }

    state.payment = payment;
    return true;
  };

  const updateMarketingConsent = (): void => {
    state.promosOptIn = promotions.checked;
  };

  const applyAvailability = (remaining: number, shouldAnnounce = false): void => {
    const normalized = Math.max(0, Math.floor(remaining));
    const previous = state.remaining;
    state.remaining = normalized;

    if (normalized > 0 && state.quantity > normalized) {
      state.quantity = normalized;
    }

    updateQuantityUI();
    renderTotals();
    updateActionBar();

    if (shouldAnnounce && normalized !== previous) {
      announce(
        normalized > 0
          ? `Disponibilidad actualizada: quedan ${normalized} platillos.`
          : 'El platillo de hoy se agotó.',
      );
    }
  };

  const renderTotals = (): void => {
    state.totals = calculateTotals(
      state.quantity,
      business.pricing.unitPrice,
      business.pricing.shippingFee,
    );

    setAllText('[data-subtotal]', formatMXN(state.totals.subtotal));
    setAllText('[data-shipping]', formatMXN(state.totals.shipping));
    setAllText('[data-total]', formatMXN(state.totals.total));
    setAllText('[data-cash-total]', formatMXN(state.totals.total));
    setAllText('[data-review-line-total]', formatMXN(state.totals.subtotal));
    setAllText('[data-review-total-quantity]', String(state.quantity));

    updateCashPreview();
    updateActionBar();
  };

  const renderReview = (): void => {
    const zone = getZone(state.customer.zoneId);
    const references = state.customer.references.trim();
    const payment = getCashSummary();

    setAllText('[data-review-dish-name]', business.dish.name);
    setAllText('[data-review-quantity]', String(state.quantity));
    setAllText('[data-review-total-quantity]', String(state.quantity));
    setAllText(
      '[data-review-address-1]',
      [state.customer.street, state.customer.addressExtra].filter(Boolean).join(', '),
    );
    setAllText(
      '[data-review-address-2]',
      `${zone?.name ?? 'Colonia por confirmar'}, ${business.brand.city}`,
    );
    setAllText('[data-review-phone]', formatPhone(state.customer.phone));
    setAllText('[data-review-schedule]', buildScheduleDetail());
    setAllText('[data-review-payment]', payment.label);
    setAllText('[data-review-payment-detail]', payment.detail);
    setAllText('[data-review-references]', references);

    const referencesWrap = root.querySelector<HTMLElement>('[data-review-references-wrap]');
    if (referencesWrap) referencesWrap.hidden = !references;

    renderTotals();
  };

  const syncDeliveryForm = (): void => {
    const fields: Array<[string, string]> = [
      ['name', state.customer.name],
      ['phone', state.customer.phone ? formatPhone(state.customer.phone) : ''],
      ['zoneId', state.customer.zoneId],
      ['street', state.customer.street],
      ['addressExtra', state.customer.addressExtra],
      ['references', state.customer.references],
      ['deliveryWindowId', state.customer.deliveryWindowId],
    ];

    fields.forEach(([name, value]) => {
      const field = deliveryForm.querySelector<HTMLInputElement | HTMLSelectElement>(
        `[name="${name}"]`,
      );
      if (field) field.value = value;
    });

    updateZoneNote();

    saveAddressCheckbox.checked = state.saveAddress;
  };

  const syncPaymentForm = (): void => {
    paymentForm.querySelectorAll<HTMLInputElement>('input[name="paymentMethod"]').forEach((radio) => {
      radio.checked = radio.value === state.payment.method;
    });
    paymentForm.querySelectorAll<HTMLInputElement>('input[name="cashMode"]').forEach((radio) => {
      radio.checked = radio.value === state.payment.cashMode;
    });
    cashAmountInput.value =
      state.payment.cashAmount !== null ? String(state.payment.cashAmount) : '';
    updatePaymentUI();
  };

  const setSubmitting = (submitting: boolean): void => {
    state.submitting = submitting;
    updateQuantityUI();
    updateActionBar();
  };

  const handleOrderError = (error: unknown): void => {
    state.submitting = false;

    if (error instanceof OrderError) {
      if (error.code === 'SOLD_OUT') {
        state.idempotencyKey = null;
        applyAvailability(0);
        announce('El platillo de hoy se agotó mientras completabas tu pedido.');
        goToStep(1);
        return;
      }

      if (error.code === 'AVAILABILITY_CHANGED') {
        state.idempotencyKey = null;
        const remaining = error.remaining ?? 0;
        applyAvailability(remaining);
        announce(`La disponibilidad cambió. Quedan ${remaining} platillos.`);

        if (remaining > 0) {
          goToStep(2);
          showQuantityError(
            `La disponibilidad cambió mientras completabas tu pedido. Quedan ${remaining} platillos.`,
          );
        } else {
          goToStep(1);
        }
        return;
      }

      showSubmitError(error.message || FALLBACK_ORDER_ERROR);
    } else {
      showSubmitError(FALLBACK_ORDER_ERROR);
    }

    updateQuantityUI();
    updateActionBar();
  };

  const submitOrder = async (): Promise<void> => {
    if (state.submitting) return;

    clearSubmitError();

    const quantityError = validateQuantity(state.quantity, state.remaining);
    if (quantityError) {
      goToStep(2);
      showQuantityError(quantityError);
      return;
    }

    const deliveryErrors = validateDelivery(state.customer, {
      zones: zoneOptions,
      deliveryWindows: business.deliveryWindows,
    });
    if (Object.keys(deliveryErrors).length > 0) {
      goToStep(3);
      showDeliveryErrors(deliveryErrors);
      return;
    }

    const paymentError = validateCash(
      state.payment.method,
      state.payment.cashMode,
      state.payment.cashAmount,
      state.totals.total,
    );
    if (paymentError) {
      goToStep(4);
      showPaymentError(paymentError);
      return;
    }

    updateMarketingConsent();
    setSubmitting(true);

    const idempotencyKey = state.idempotencyKey ?? createIdempotencyKey();
    state.idempotencyKey = idempotencyKey;

    const paymentForOrder: PaymentSelection =
      state.payment.method === 'cash' && state.payment.cashMode === 'exact'
        ? { ...state.payment, cashAmount: state.totals.total }
        : state.payment;

    try {
      const order = await services.orders.createOrder({
        idempotencyKey,
        quantity: state.quantity,
        customer: state.customer,
        payment: paymentForOrder,
        subtotal: state.totals.subtotal,
        shipping: state.totals.shipping,
        total: state.totals.total,
        promosOptIn: state.promosOptIn,
      });

      state.order = order;
      state.submitting = false;
      saveCurrentAddress();
      renderSuccess(order);
      goToStep(6, { focus: true, announce: false });
      announce(
        order.isDemo
          ? `Pedido de demostración ${order.folio} registrado.`
          : `Pedido ${order.folio} registrado.`,
      );
    } catch (error) {
      handleOrderError(error);
    } finally {
      if (state.step !== 6) {
        setSubmitting(false);
      }
    }
  };

  const renderSuccess = (order: CreatedOrder): void => {
    const payment = getCashSummary();
    const isDemo = order.isDemo;

    setAllText(
      '[data-success-kicker]',
      isDemo ? 'Modo demostración' : 'Pedido registrado',
    );
    setAllText(
      '[data-success-title]',
      isDemo ? 'Pedido de demostración' : 'Pedido recibido',
    );
    setAllText(
      '[data-success-subtitle]',
      isDemo
        ? 'Guarda tu folio. El siguiente paso es continuar por WhatsApp.'
        : 'Gracias. Ya estamos preparando tu pedido.',
    );
    setAllText('[data-success-folio]', order.folio);
    setAllText(
      '[data-success-status]',
      order.status === 'pending_transfer'
        ? 'Pago pendiente de verificación'
        : 'Pago al recibir',
    );
    setAllText('[data-success-quantity]', String(order.quantity));
    setAllText('[data-success-phone]', formatPhone(state.customer.phone));
    setAllText('[data-success-address]', buildAddress());
    setAllText('[data-success-schedule]', buildScheduleDetail());
    setAllText('[data-success-payment]', payment.label);
    setAllText('[data-success-total]', formatMXN(order.total));

    const references = state.customer.references.trim();
    setAllText('[data-success-references]', references);
    const successReferencesRow = root.querySelector<HTMLElement>('[data-success-references-row]');
    if (successReferencesRow) successReferencesRow.hidden = !references;

    const successCash = root.querySelector<HTMLElement>('[data-success-cash]');
    if (successCash) {
      if (state.payment.method === 'cash') {
        if (state.payment.cashMode === 'exact') {
          successCash.textContent = `Pagas ${formatMXN(state.totals.total)} en efectivo al recibir.`;
        } else {
          const amount = state.payment.cashAmount ?? 0;
          const change = calculateChange(amount, state.totals.total);
          successCash.textContent = `Pagas con ${formatMXN(amount)} · Cambio: ${formatMXN(change)}.`;
        }
        successCash.hidden = false;
      } else {
        successCash.hidden = true;
      }
    }

    demoBanner.hidden = !isDemo;

    const bank = business.payments.transfer;
    if (order.paymentMethod === 'transfer') {
      bankCard.hidden = false;
      setAllText('[data-bank-amount]', formatMXN(order.total));

      const hasBankData = Boolean(bank.bankName && bank.accountHolder && bank.clabe);
      bankDetails.hidden = !hasBankData;
      bankMissing.hidden = hasBankData;

      if (hasBankData) {
        setAllText('[data-bank-name]', bank.bankName);
        setAllText('[data-bank-holder]', bank.accountHolder);
        setAllText('[data-bank-clabe]', bank.clabe);
        setAllText(
          '[data-bank-reference]',
          bank.referencePrefix ? `${bank.referencePrefix}-${order.folio}` : order.folio,
        );
      }
    } else {
      bankCard.hidden = true;
    }

    const whatsappMessage = buildWhatsAppMessage({
      isDemo,
      folio: order.folio,
      dishName: business.dish.name,
      quantity: order.quantity,
      total: order.total,
      paymentMethod: order.paymentMethod,
    });
    const whatsappUrl = buildWhatsAppUrl(business.whatsapp.number, whatsappMessage);

    if (whatsappUrl) {
      whatsappButton.href = whatsappUrl;
      whatsappButton.hidden = false;
      whatsappNote.hidden = false;
      whatsappNote.textContent = isDemo
        ? 'Para iniciar la conversación, toca enviar en WhatsApp. El número es de ejemplo en esta demostración.'
        : 'Para iniciar la conversación, toca enviar en WhatsApp.';
    } else {
      whatsappButton.hidden = true;
      whatsappNote.textContent = 'El WhatsApp del negocio aún no está configurado.';
    }
  };

  const markDirty = (): void => {
    state.idempotencyKey = null;
  };

  const changeQuantity = (delta: number): void => {
    if (state.submitting || state.remaining <= 0) return;

    const next = Math.min(state.remaining, Math.max(1, state.quantity + delta));
    if (next === state.quantity) return;

    state.quantity = next;
    clearQuantityError();
    markDirty();
    updateQuantityUI();
    renderTotals();
  };

  const startEdit = (step: EditableStep): void => {
    if (state.submitting) return;
    state.editingFromReview = true;
    clearSubmitError();
    goToStep(step);
  };

  const handleBack = (): void => {
    if (state.submitting) return;

    if (state.editingFromReview && state.step >= 2 && state.step <= 4) {
      state.editingFromReview = false;
      if (state.step === 3) syncDeliveryForm();
      if (state.step === 4) syncPaymentForm();
      goToStep(5);
      return;
    }

    if (state.step === 1) return;
    if (state.step === 2) {
      goToStep(1);
      return;
    }
    if (state.step === 5) {
      goToStep(4);
      return;
    }
    if (state.step === 3) {
      goToStep(2);
      return;
    }
    goToStep(3);
  };

  const finishEditingOrAdvance = (next: 3 | 4 | 5): void => {
    if (state.editingFromReview) {
      state.editingFromReview = false;
      goToStep(5);
      return;
    }
    goToStep(next);
  };

  const handlePrimary = (): void => {
    if (state.submitting) return;

    if (state.step === 1) {
      if (state.remaining <= 0) return;
      goToStep(2);
      return;
    }

    if (state.step === 2) {
      clearQuantityError();
      const error = validateQuantity(state.quantity, state.remaining);
      if (error) {
        showQuantityError(error);
        return;
      }
      finishEditingOrAdvance(3);
      return;
    }

    if (state.step === 3) {
      if (!validateAndSaveDelivery()) return;
      finishEditingOrAdvance(4);
      return;
    }

    if (state.step === 4) {
      if (!validateAndSavePayment()) return;
      finishEditingOrAdvance(5);
      return;
    }

    if (state.step === 5) {
      void submitOrder();
    }
  };

  // Eventos de navegación y acciones.
  root.addEventListener('click', (event) => {
    const target = event.target as HTMLElement;

    if (target.closest('[data-primary]')) {
      handlePrimary();
      return;
    }

    if (target.closest('[data-back]')) {
      handleBack();
      return;
    }

    const editButton = target.closest<HTMLElement>('[data-edit]');
    if (editButton) {
      const step = Number(editButton.dataset.edit);
      if (step === 2 || step === 3 || step === 4) startEdit(step);
      return;
    }

    const savedAddressButton = target.closest<HTMLButtonElement>('[data-use-address]');
    if (savedAddressButton?.dataset.useAddress) {
      applySavedAddress(savedAddressButton.dataset.useAddress);
      return;
    }

    if (target.closest('[data-forget-addresses]')) {
      forgetSavedAddresses();
      return;
    }

    if (target.closest('[data-qty-inc]')) {
      changeQuantity(1);
      return;
    }

    if (target.closest('[data-qty-dec]')) {
      changeQuantity(-1);
    }
  });

  // Formulario de entrega: errores, formato de teléfono y estimación por colonia.
  const handleDeliveryInput = (event: Event): void => {
    const target = event.target as HTMLInputElement | HTMLSelectElement;
    if (!(target instanceof HTMLElement)) return;

    const name = target.getAttribute('name');
    if (!name) return;

    clearDeliveryError(name);
    if (name === 'zoneId') updateZoneNote();
    markDirty();
  };

  phoneInput.addEventListener('blur', () => {
    const digits = normalizePhone(phoneInput.value);
    phoneInput.value = digits.length === 10 ? formatPhone(digits) : phoneInput.value.trim();
  });

  deliveryForm.addEventListener('input', handleDeliveryInput);
  deliveryForm.addEventListener('change', handleDeliveryInput);

  // Pago: alternar efectivo/transferencia y calcular cambio.
  paymentForm.addEventListener('change', (event) => {
    const target = event.target as HTMLInputElement;
    const name = target.getAttribute('name');

    if (name === 'paymentMethod') {
      clearPaymentErrors();
      updatePaymentUI();
      markDirty();
    }

    if (name === 'cashMode') {
      clearPaymentErrors();
      updatePaymentUI();
      markDirty();
    }

    if (name === 'cashAmount') {
      updateCashPreview();
      markDirty();
    }
  });

  cashAmountInput.addEventListener('input', () => {
    const digits = cashAmountInput.value.replace(/\D/g, '');
    if (cashAmountInput.value !== digits) cashAmountInput.value = digits;
    clearPaymentErrors();
    updateCashPreview();
    markDirty();
  });

  promotions.addEventListener('change', () => {
    updateMarketingConsent();
  });

  saveAddressCheckbox.addEventListener('change', () => {
    state.saveAddress = saveAddressCheckbox.checked;
  });

  // La barra fija se oculta cuando el teclado del móvil reduce el viewport.
  const visualViewport = window.visualViewport;
  const updateKeyboardState = (): void => {
    if (!visualViewport) return;
    const keyboardOpen = window.innerHeight - visualViewport.height > 150;
    document.documentElement.classList.toggle('keyboard-open', keyboardOpen);
  };

  visualViewport?.addEventListener('resize', updateKeyboardState);
  window.addEventListener('orientationchange', updateKeyboardState);

  // Estado inicial.
  updateQuantityUI();
  renderTotals();
  updatePaymentUI();
  updateZoneNote();
  renderSavedAddresses();
  goToStep(1, { focus: false });

  void services.availability
    .getAvailability()
    .then((availability) => {
      applyAvailability(availability.remaining, true);
    })
    .catch(() => {
      // Mantiene la disponibilidad configurada si el servicio no responde.
    });

  // Fallback de fotografía del platillo.
  const dishImage = root.querySelector<HTMLImageElement>('[data-dish-image]');
  const dishFallback = root.querySelector<HTMLElement>('[data-dish-fallback]');

  if (dishImage && dishFallback) {
    const showFallback = (): void => {
      dishImage.hidden = true;
      dishFallback.hidden = false;
    };

    dishImage.addEventListener('error', showFallback);
    if (dishImage.complete && dishImage.naturalWidth === 0) showFallback();
  }
};
