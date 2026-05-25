/**
 * SHARED — RabbitMQ Queue Registry
 * All queue names in one place. Import, never hardcode.
 */
const QUEUES = {
  // ── Email jobs ────────────────────────────────
  EMAIL_WELCOME:          'email.welcome',
  EMAIL_ORDER_CONFIRM:    'email.order_confirm',
  EMAIL_ORDER_CANCEL:     'email.order_cancel',
  EMAIL_ORDER_STATUS:     'email.order_status',
  EMAIL_PASSWORD_RESET:   'email.password_reset',
  EMAIL_PAYMENT_RECEIPT:  'email.payment_receipt',
  EMAIL_REFUND:           'email.refund',

  // ── Payment processing ────────────────────────
  PAYMENT_PROCESS:        'payment.process',       // initiate gateway call
  PAYMENT_WEBHOOK:        'payment.webhook',        // incoming gateway webhook retry

  // ── Inventory jobs ────────────────────────────
  INVENTORY_DEDUCT:       'inventory.deduct',       // deduct after order placed (with retry)
  INVENTORY_RESTORE:      'inventory.restore',      // restore after cancel/return

  // ── Notification jobs ─────────────────────────
  NOTIFICATION_IN_APP:    'notification.in_app',    // create in-app notification record

  // ── Report/export jobs ────────────────────────
  REPORT_GENERATE:        'report.generate',        // admin export jobs
};

module.exports = QUEUES;
