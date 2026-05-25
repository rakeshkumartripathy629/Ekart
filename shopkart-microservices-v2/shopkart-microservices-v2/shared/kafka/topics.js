/**
 * SHARED — Kafka Topic Registry
 * Single source of truth for all topic names.
 * Both publishers and consumers import from here — never hardcode strings.
 */
const TOPICS = {
  // ── Order events ──────────────────────────────
  ORDER_PLACED:          'order.placed',           // order-service → cart, payment, notification, inventory
  ORDER_STATUS_UPDATED:  'order.status_updated',   // admin/order-service → notification, payment
  ORDER_CANCELLED:       'order.cancelled',         // order-service → inventory, payment, notification
  ORDER_RETURNED:        'order.returned',          // order-service → inventory, notification

  // ── Payment events ────────────────────────────
  PAYMENT_INITIATED:     'payment.initiated',       // order-service → payment-service
  PAYMENT_CONFIRMED:     'payment.confirmed',       // payment-service → order, notification
  PAYMENT_FAILED:        'payment.failed',          // payment-service → order, notification
  PAYMENT_REFUNDED:      'payment.refunded',        // payment-service → order, notification

  // ── Inventory events ──────────────────────────
  INVENTORY_DEDUCTED:    'inventory.deducted',      // order-service → product-service
  INVENTORY_RESTORED:    'inventory.restored',      // order-service → product-service (cancel/return)
  INVENTORY_LOW_STOCK:   'inventory.low_stock',     // product-service → notification (admin alert)

  // ── User events ───────────────────────────────
  USER_REGISTERED:       'user.registered',         // auth-service → notification (welcome email)
  USER_PASSWORD_RESET:   'user.password_reset',     // auth-service → notification (reset email)

  // ── Cart events ───────────────────────────────
  CART_CLEARED:          'cart.cleared',            // order-service → cart-service (after order placed)

  // ── Notification events ───────────────────────
  NOTIFICATION_SEND:     'notification.send',       // any-service → notification-service
};

module.exports = TOPICS;
