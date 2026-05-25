const { consumeEvents, publishEvent } = require('../../shared/kafka/kafkaClient');
const TOPICS = require('../../shared/kafka/topics');
const { consumeJobs } = require('../../shared/rabbitmq/rabbitmqClient');
const QUEUES = require('../../shared/rabbitmq/queues');
const Payment = require('../models/Payment');

/**
 * Payment Service — Consumers
 *
 * Kafka: ORDER_PLACED → create payment record
 * RabbitMQ: PAYMENT_PROCESS queue → call payment gateway (retryable)
 * RabbitMQ: PAYMENT_WEBHOOK queue → process incoming gateway webhooks (retryable)
 */
const startConsumers = async () => {

  // ── Kafka: create payment record when order placed ──
  await consumeEvents(
    'payment-service-group',
    [TOPICS.ORDER_PLACED, TOPICS.ORDER_CANCELLED],
    async (topic, payload) => {
      if (topic === TOPICS.ORDER_PLACED) {
        const existing = await Payment.findOne({ orderId: payload.orderId });
        if (existing) return; // idempotent

        await Payment.create({
          orderId:      payload.orderId,
          orderMongoId: payload.orderMongoId,
          userId:       payload.userId,
          amount:       payload.total,
          method:       payload.paymentMethod,
          status:       payload.paymentMethod === 'cod' ? 'pending' : 'initiated',
          currency:     'INR',
        });
        console.log(`[Payment] Record created for order ${payload.orderId}`);
      }

      if (topic === TOPICS.ORDER_CANCELLED) {
        // Mark for refund
        await Payment.findOneAndUpdate(
          { orderId: payload.orderId, status: 'success' },
          { status: 'refund_initiated' }
        );
      }
    }
  );

  // ── RabbitMQ: process payment gateway calls (retryable) ──
  await consumeJobs(QUEUES.PAYMENT_PROCESS, async (job) => {
    // Simulate gateway call (replace with Razorpay/Stripe SDK)
    const payment = await Payment.findOne({ orderId: job.orderId });
    if (!payment) return;

    try {
      // TODO: Call actual payment gateway here
      // const gatewayRes = await razorpay.orders.create({ amount: payment.amount * 100, currency: 'INR' });
      payment.gatewayOrderId = `order_${Date.now()}`;
      payment.status = 'initiated';
      await payment.save();
      console.log(`[Payment] Gateway initiated for ${job.orderId}`);
    } catch (err) {
      console.error(`[Payment] Gateway call failed for ${job.orderId}:`, err.message);
      throw err; // triggers RabbitMQ retry
    }
  });

  // ── RabbitMQ: process incoming gateway webhooks ──
  await consumeJobs(QUEUES.PAYMENT_WEBHOOK, async (job) => {
    const { orderId, orderMongoId, gatewayPaymentId, gatewaySignature, status } = job;

    if (status === 'success') {
      await Payment.findOneAndUpdate(
        { orderId },
        { status: 'success', gatewayPaymentId, gatewaySignature }
      );
      // ✅ Publish Kafka event → order-service updates paymentStatus
      await publishEvent(TOPICS.PAYMENT_CONFIRMED, {
        orderId, orderMongoId,
        transactionId: gatewayPaymentId,
      }, orderId);
      console.log(`[Payment] Confirmed for order ${orderId}`);
    }

    if (status === 'failed') {
      await Payment.findOneAndUpdate({ orderId }, { status: 'failed' });
      await publishEvent(TOPICS.PAYMENT_FAILED, { orderId, orderMongoId }, orderId);
    }
  });

  console.log('✅ [Payment] Kafka + RabbitMQ consumers started');
};

module.exports = { startConsumers };
