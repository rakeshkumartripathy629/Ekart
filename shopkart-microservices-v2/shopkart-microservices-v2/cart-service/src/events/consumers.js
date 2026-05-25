const { consumeEvents } = require('../../shared/kafka/kafkaClient');
const TOPICS = require('../../shared/kafka/topics');
const Cart = require('../models/Cart');
const Coupon = require('../models/Coupon');

/**
 * Cart Service — Kafka Consumers
 *
 * ORDER_PLACED → clear user cart + increment coupon usage
 * (Previously this was done synchronously in order-service — WRONG for microservices)
 */
const startConsumers = async () => {
  await consumeEvents(
    'cart-service-group',
    [TOPICS.ORDER_PLACED],
    async (topic, payload) => {
      if (topic === TOPICS.ORDER_PLACED) {
        // Clear user cart after order placed
        await Cart.findOneAndUpdate(
          { user: payload.userId },
          { items: [], couponCode: undefined, couponDiscount: 0 }
        );

        // Increment coupon usage if coupon was used
        if (payload.couponCode) {
          await Coupon.findOneAndUpdate(
            { code: payload.couponCode },
            { $inc: { usedCount: 1 } }
          );
        }

        console.log(`[Cart] Cart cleared for user ${payload.userId} after order ${payload.orderId}`);
      }
    }
  );

  console.log('✅ [Cart] Kafka consumers started');
};

module.exports = { startConsumers };
