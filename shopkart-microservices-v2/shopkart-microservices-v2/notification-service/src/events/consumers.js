const { consumeEvents } = require('../../shared/kafka/kafkaClient');
const TOPICS = require('../../shared/kafka/topics');
const { consumeJobs } = require('../../shared/rabbitmq/rabbitmqClient');
const QUEUES = require('../../shared/rabbitmq/queues');
const Notification = require('../models/Notification');
const { sendEmail } = require('../services/email.service');

const startConsumers = async () => {

  // Kafka: in-app notifications
  await consumeEvents(
    'notification-service-group',
    [
      TOPICS.ORDER_PLACED, TOPICS.ORDER_STATUS_UPDATED, TOPICS.ORDER_CANCELLED,
      TOPICS.ORDER_RETURNED, TOPICS.PAYMENT_CONFIRMED, TOPICS.PAYMENT_FAILED,
      TOPICS.PAYMENT_REFUNDED, TOPICS.USER_REGISTERED, TOPICS.INVENTORY_LOW_STOCK,
    ],
    async (topic, payload) => {
      if (topic === TOPICS.ORDER_PLACED) {
        await Notification.create({
          user: payload.userId, type: 'order', icon: '🛒',
          title: 'Order Placed Successfully! 🎉',
          message: `Your order #${payload.orderId} is confirmed. Estimated delivery in 2 days.`,
          link: `/orders/${payload.orderId}`,
        });
      }
      if (topic === TOPICS.ORDER_STATUS_UPDATED) {
        const icons = { shipped:'🚚', out_for_delivery:'🛵', delivered:'🎉', confirmed:'✅', packed:'📦' };
        await Notification.create({
          user: payload.userId, type: 'delivery',
          icon: icons[payload.newStatus] || '📦',
          title: `Order ${payload.newStatus.replace(/_/g,' ').toUpperCase()}`,
          message: payload.description || `Your order #${payload.orderId} status updated.`,
          link: `/orders/${payload.orderId}`,
        });
      }
      if (topic === TOPICS.ORDER_CANCELLED) {
        await Notification.create({
          user: payload.userId, type: 'order', icon: '❌',
          title: 'Order Cancelled',
          message: `Order #${payload.orderId} cancelled. Refund in 5-7 business days.`,
        });
      }
      if (topic === TOPICS.ORDER_RETURNED) {
        await Notification.create({
          user: payload.userId, type: 'order', icon: '↩️',
          title: 'Return Request Submitted',
          message: `Return for order #${payload.orderId} initiated. Pickup in 2-3 days.`,
        });
      }
      if (topic === TOPICS.PAYMENT_CONFIRMED) {
        await Notification.create({
          user: payload.userId, type: 'payment', icon: '💳',
          title: 'Payment Confirmed ✅',
          message: `Payment for order #${payload.orderId} confirmed.`,
        });
      }
      if (topic === TOPICS.PAYMENT_FAILED) {
        await Notification.create({
          user: payload.userId, type: 'payment', icon: '⚠️',
          title: 'Payment Failed',
          message: `Payment for order #${payload.orderId} failed. Please retry.`,
          link: `/orders/${payload.orderId}`,
        });
      }
      if (topic === TOPICS.PAYMENT_REFUNDED) {
        await Notification.create({
          user: payload.userId, type: 'payment', icon: '💰',
          title: 'Refund Processed',
          message: `Refund of INR ${payload.refundAmount} processed. Allow 5-7 business days.`,
        });
      }
      if (topic === TOPICS.USER_REGISTERED) {
        await Notification.create({
          user: payload.userId, type: 'system', icon: '👋',
          title: `Welcome to ShopKart, ${payload.name}!`,
          message: 'Start exploring thousands of products.',
          link: '/',
        });
      }
      if (topic === TOPICS.INVENTORY_LOW_STOCK) {
        const User = require('../models/User');
        const admins = await User.find({ role: 'admin' }).select('_id');
        for (const admin of admins) {
          await Notification.create({
            user: admin._id, type: 'system', icon: '⚠️',
            title: 'Low Stock Alert',
            message: `"${payload.name}" has only ${payload.stock} units left.`,
            link: '/admin/inventory',
          });
        }
      }
    }
  );

  // RabbitMQ: email jobs (retryable with DLQ)
  await consumeJobs(QUEUES.EMAIL_WELCOME, async (job) => {
    await sendEmail({ to: job.to, subject: 'Welcome to ShopKart!',
      html: `<h2>Welcome, ${job.name}!</h2><p>Your account is ready. Happy shopping!</p>` });
  });

  await consumeJobs(QUEUES.EMAIL_ORDER_CONFIRM, async (job) => {
    await sendEmail({ to: job.to, subject: `Order Confirmed #${job.orderId}`,
      html: `<h2>Order Confirmed!</h2><p>Hi ${job.name}, order #${job.orderId} placed. Total: INR ${job.total}</p>` });
  });

  await consumeJobs(QUEUES.EMAIL_ORDER_CANCEL, async (job) => {
    await sendEmail({ to: job.to, subject: `Order Cancelled #${job.orderId}`,
      html: `<h2>Order Cancelled</h2><p>Hi ${job.name}, order #${job.orderId} cancelled. Refund: INR ${job.total}</p>` });
  });

  await consumeJobs(QUEUES.EMAIL_ORDER_STATUS, async (job) => {
    const User = require('../models/User');
    const user = await User.findById(job.userId).select('name email');
    if (!user) return;
    await sendEmail({ to: user.email, subject: `Order Update #${job.orderId}`,
      html: `<h2>Order ${job.newStatus.toUpperCase()}</h2><p>Hi ${user.name}, your order #${job.orderId} is now ${job.newStatus}.</p>` });
  });

  await consumeJobs(QUEUES.EMAIL_PASSWORD_RESET, async (job) => {
    await sendEmail({ to: job.to, subject: 'Password Reset - ShopKart',
      html: `<h2>Password Reset</h2><p>Hi ${job.name}, <a href="${job.resetUrl}">click here</a> to reset (valid 15 min).</p>` });
  });

  await consumeJobs(QUEUES.EMAIL_REFUND, async (job) => {
    await sendEmail({ to: job.to, subject: `Refund Processed #${job.orderId}`,
      html: `<h2>Refund Processed</h2><p>Hi ${job.name}, refund of INR ${job.refundAmount} processed.</p>` });
  });

  console.log('[Notification] Kafka + RabbitMQ consumers started');
};

module.exports = { startConsumers };
