export type PaymentMethod = 'transfer' | 'cash';
export type CashMode = 'exact' | 'custom';

export interface DeliveryZone {
  id: string;
  name: string;
  estimate: string | null;
  enabled: boolean;
}

export interface DeliveryWindow {
  id: string;
  label: string;
  enabled: boolean;
}

export interface OrderCustomer {
  name: string;
  phone: string;
  zoneId: string;
  street: string;
  addressExtra: string;
  references: string;
  deliveryWindowId: string;
}

export interface PaymentSelection {
  method: PaymentMethod | null;
  cashMode: CashMode;
  cashAmount: number | null;
}

export interface OrderDraft {
  quantity: number;
  customer: OrderCustomer;
  payment: PaymentSelection;
  promosOptIn: boolean;
}

export interface OrderTotals {
  subtotal: number;
  shipping: number;
  total: number;
}

export interface Availability {
  remaining: number;
  isDemo: boolean;
}

export type OrderStatus = 'pending_transfer' | 'pay_on_delivery';

export interface CreatedOrder {
  folio: string;
  createdAt: string;
  status: OrderStatus;
  isDemo: boolean;
  quantity: number;
  total: number;
  paymentMethod: PaymentMethod;
}

export interface CreateOrderRequest {
  idempotencyKey: string;
  quantity: number;
  customer: OrderCustomer;
  payment: PaymentSelection;
  subtotal: number;
  shipping: number;
  total: number;
  promosOptIn: boolean;
}

export interface AvailabilityService {
  getAvailability(): Promise<Availability>;
}

export interface OrderService {
  createOrder(request: CreateOrderRequest): Promise<CreatedOrder>;
}

export type OrderErrorCode =
  | 'SOLD_OUT'
  | 'AVAILABILITY_CHANGED'
  | 'NETWORK'
  | 'VALIDATION'
  | 'UNKNOWN';

export class OrderError extends Error {
  code: OrderErrorCode;
  remaining?: number;

  constructor(code: OrderErrorCode, message: string, remaining?: number) {
    super(message);
    this.name = 'OrderError';
    this.code = code;
    this.remaining = remaining;
  }
}
