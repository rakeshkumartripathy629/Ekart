const { publishEvent } = require('../../../shared/kafka/kafkaClient');
const TOPICS = require('../../../shared//kafka/topics');
const { publishJob } = require('../../../shared/rabbitmq/rabbitmqClient');
const QUEUES = require('../../../shared/rabbitmq/queues');

/**
 * Published after successful registration.
 * → notification-service consumes → sends welcome email via RabbitMQ
 */
exports.publishUserRegistered = async (user) => {
  await publishEvent(TOPICS.USER_REGISTERED, {
    userId: user._id.toString(),
    name:   user.name,
    email:  user.email,
  });

  // Also queue the actual email send via RabbitMQ (retryable)
  await publishJob(QUEUES.EMAIL_WELCOME, {
    to:   user.email,
    name: user.name,
  });
};

/**
 * Published after forgot-password token generated.
 * → notification-service queues reset email
 */
exports.publishPasswordReset = async (user, resetUrl) => {
  await publishEvent(TOPICS.USER_PASSWORD_RESET, {
    userId:   user._id.toString(),
    email:    user.email,
    resetUrl,
  });

  await publishJob(QUEUES.EMAIL_PASSWORD_RESET, {
    to:       user.email,
    name:     user.name,
    resetUrl,
  });
};
