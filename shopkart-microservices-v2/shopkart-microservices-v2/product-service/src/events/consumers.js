const { consumeEvents } = require('../../shared/kafka/kafkaClient');
const TOPICS = require('../../shared/kafka/topics');
const Product = require('../models/Product');
const Inventory = require('../models/Inventory');
const { publishEvent } = require('../../shared/kafka/kafkaClient');

/**
 * Product Service — Kafka Consumers
 *
 * ORDER_PLACED       → deduct stock per item
 * ORDER_CANCELLED    → restore stock per item
 * ORDER_RETURNED     → restore stock per item
 */
const startConsumers = async () => {
  await consumeEvents(
    'product-service-group',
    [TOPICS.ORDER_PLACED, TOPICS.ORDER_CANCELLED, TOPICS.ORDER_RETURNED],
    async (topic, payload) => {

      if (topic === TOPICS.ORDER_PLACED) {
        for (const item of payload.items) {
          const product = await Product.findById(item.productId);
          if (!product) continue;
          const before = product.stock;
          product.stock = Math.max(0, product.stock - item.qty);
          product.totalSold += item.qty;
          if (item.variant) {
            const v = product.variants.find(vv => vv.label === item.variant);
            if (v) v.stock = Math.max(0, v.stock - item.qty);
          }
          await product.save({ validateBeforeSave: false });

          // Log inventory movement
          await Inventory.create({
            product: product._id, variant: item.variant || '',
            type: 'sale', quantity: -item.qty,
            stockBefore: before, stockAfter: product.stock,
            reason: `Order: ${payload.orderId}`,
            reference: payload.orderId,
          });

          // Low stock alert
          if (product.stock <= 10) {
            await publishEvent(TOPICS.INVENTORY_LOW_STOCK, {
              productId: product._id.toString(),
              name:      product.name,
              stock:     product.stock,
            });
          }
        }
        console.log(`[Product] Stock deducted for order ${payload.orderId}`);
      }

      if (topic === TOPICS.ORDER_CANCELLED || topic === TOPICS.ORDER_RETURNED) {
        for (const item of payload.items) {
          const product = await Product.findById(item.productId);
          if (!product) continue;
          const before = product.stock;
          product.stock += item.qty;
          product.totalSold = Math.max(0, product.totalSold - item.qty);
          if (item.variant) {
            const v = product.variants.find(vv => vv.label === item.variant);
            if (v) v.stock += item.qty;
          }
          await product.save({ validateBeforeSave: false });

          await Inventory.create({
            product: product._id, variant: item.variant || '',
            type: 'return', quantity: +item.qty,
            stockBefore: before, stockAfter: product.stock,
            reason: `Order ${topic === TOPICS.ORDER_CANCELLED ? 'cancelled' : 'returned'}: ${payload.orderId}`,
            reference: payload.orderId,
          });
        }
        console.log(`[Product] Stock restored for order ${payload.orderId}`);
      }
    }
  );

  console.log('✅ [Product] Kafka consumers started');
};

module.exports = { startConsumers };
