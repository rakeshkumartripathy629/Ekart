const { publishEvent } = require('../../shared/kafka/kafkaClient');
const TOPICS = require('../../shared/kafka/topics');
const { publishJob } = require('../../shared/rabbitmq/rabbitmqClient');
const QUEUES = require('../../shared/rabbitmq/queues');

/**
 * ORDER PLACED
 * Triggers:
 *   → cart-service:    CART_CLEARED (clear user cart)
 *   → payment-service: PAYMENT_INITIATED (create payment record)
 *   → product-service: INVENTORY_DEDUCTED (deduct stock)
 *   → notification-service: NOTIFICATION_SEND (in-app + email via RabbitMQ)
 */
exports.publishOrderPlaced = async (order, user) => {
  const payload = {
    orderId:     order.orderId,
    orderMongoId:order._id.toString(),
    userId:      order.user.toString(),
    items:       order.items.map(i => ({
      productId: i.product.toString(),
      name:      i.name,
      qty:       i.qty,
      variant:   i.variant || '',
      price:     i.price,
    })),
    total:          order.total,
    paymentMethod:  order.paymentMethod,
    couponCode:     order.couponCode || null,
    estimatedDelivery: order.estimatedDelivery,
  };

  // Kafka — high-throughput event fan-out
  await publishEvent(TOPICS.ORDER_PLACED, payload, order.orderId);

  // RabbitMQ — retryable email job
  await publishJob(QUEUES.EMAIL_ORDER_CONFIRM, {
    to:      user.email,
    name:    user.name,
    orderId: order.orderId,
    total:   order.total,
    estimatedDelivery: order.estimatedDelivery,
    paymentMethod: order.paymentMethod,
  });
};

/**
 * ORDER CANCELLED
 * → product-service: INVENTORY_RESTORED
 * → payment-service: initiate refund
 * → notification-service: NOTIFICATION_SEND
 */
exports.publishOrderCancelled = async (order, user) => {
  await publishEvent(TOPICS.ORDER_CANCELLED, {
    orderId:      order.orderId,
    orderMongoId: order._id.toString(),
    userId:       order.user.toString(),
    items:        order.items.map(i => ({
      productId: i.product.toString(),
      qty:       i.qty,
      variant:   i.variant || '',
    })),
    total:        order.total,
    paymentMethod: order.paymentMethod,
    cancelReason: order.cancelReason,
  }, order.orderId);

  await publishJob(QUEUES.EMAIL_ORDER_CANCEL, {
    to:      user.email,
    name:    user.name,
    orderId: order.orderId,
    total:   order.total,
  });
};

/**
 * ORDER STATUS UPDATED (admin)
 * → notification-service: notify user
 */
exports.publishOrderStatusUpdated = async (order, newStatus, description) => {
  await publishEvent(TOPICS.ORDER_STATUS_UPDATED, {
    orderId:      order.orderId,
    orderMongoId: order._id.toString(),
    userId:       order.user.toString(),
    newStatus,
    description,
  }, order.orderId);

  // Email for delivery milestones
  if (['shipped', 'out_for_delivery', 'delivered'].includes(newStatus)) {
    await publishJob(QUEUES.EMAIL_ORDER_STATUS, {
      userId:   order.user.toString(),
      orderId:  order.orderId,
      newStatus,
      description,
    });
  }
};

/**
 * ORDER RETURNED
 * → inventory-service: restore stock
 * → notification-service: notify
 */
exports.publishOrderReturned = async (order) => {
  await publishEvent(TOPICS.ORDER_RETURNED, {
    orderId:      order.orderId,
    orderMongoId: order._id.toString(),
    userId:       order.user.toString(),
    items:        order.items.map(i => ({
      productId: i.product.toString(),
      qty:       i.qty,
      variant:   i.variant || '',
    })),
    returnReason: order.returnReason,
  }, order.orderId);
};
