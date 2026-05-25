const { consumeEvents } = require('../../shared/kafka/kafkaClient');
const TOPICS = require('../../shared/kafka/topics');
const Order = require('../models/Order');

/**
 * Order Service — Kafka Consumers
 * Listens for payment confirmation to update order payment status.
 */
const startConsumers = async () => {
  await consumeEvents(
    'order-service-group',
    [TOPICS.PAYMENT_CONFIRMED, TOPICS.PAYMENT_FAILED, TOPICS.PAYMENT_REFUNDED],
    async (topic, payload) => {

      if (topic === TOPICS.PAYMENT_CONFIRMED) {
        await Order.findByIdAndUpdate(payload.orderMongoId, {
          paymentStatus: 'paid',
          transactionId: payload.transactionId,
        });
        console.log(`[Order] Payment confirmed for order ${payload.orderId}`);
      }

      if (topic === TOPICS.PAYMENT_FAILED) {
        await Order.findByIdAndUpdate(payload.orderMongoId, {
          paymentStatus: 'failed',
        });
        console.log(`[Order] Payment failed for order ${payload.orderId}`);
      }

      if (topic === TOPICS.PAYMENT_REFUNDED) {
        await Order.findByIdAndUpdate(payload.orderMongoId, {
          paymentStatus: 'refunded',
        });
        console.log(`[Order] Payment refunded for order ${payload.orderId}`);
      }
    }
  );

  console.log('✅ [Order] Kafka consumers started');
};

module.exports = { startConsumers };
