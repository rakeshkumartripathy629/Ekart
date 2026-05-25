/**
 * Auth Service — Kafka Consumers
 * Auth service primarily publishes events.
 * It has no incoming Kafka events to consume currently.
 */
const startConsumers = async () => {
  // Auth service only publishes USER_REGISTERED, USER_PASSWORD_RESET
  // No consumers needed here yet
  console.log('✅ [Auth] Event publishers ready');
};

module.exports = { startConsumers };
