/**
 * SHARED — Kafka Client
 * Every service imports this to publish / consume events via Kafka.
 * Kafka is used for HIGH-THROUGHPUT, ordered, durable events:
 *   order.placed | order.status_updated | payment.confirmed | inventory.deducted
 */
const { Kafka, Partitioners, logLevel } = require('kafkajs');

const kafka = new Kafka({
  clientId: process.env.KAFKA_CLIENT_ID || 'shopkart',
  brokers: (process.env.KAFKA_BROKERS || 'kafka:9092').split(','),
  logLevel: logLevel.WARN,
  retry: { initialRetryTime: 300, retries: 10 },
});

// ── Producer ──────────────────────────────────────
let _producer = null;

const getProducer = async () => {
  if (_producer) return _producer;
  _producer = kafka.producer({
    createPartitioner: Partitioners.LegacyPartitioner,
    allowAutoTopicCreation: true,
  });
  await _producer.connect();
  console.log('✅ [Kafka] Producer connected');
  return _producer;
};

/**
 * Publish a single event to a Kafka topic.
 * @param {string} topic  - e.g. 'order.placed'
 * @param {object} payload - serialized as JSON
 * @param {string} [key]   - partition key (e.g. orderId for ordering)
 */
const publishEvent = async (topic, payload, key = null) => {
  const producer = await getProducer();
  await producer.send({
    topic,
    messages: [
      {
        key: key ? String(key) : null,
        value: JSON.stringify({ ...payload, _ts: Date.now() }),
      },
    ],
  });
};

// ── Consumer ──────────────────────────────────────
/**
 * Subscribe a consumer group to one or more topics.
 * @param {string}   groupId  - unique per service+role
 * @param {string[]} topics
 * @param {Function} handler  - async (topic, payload) => void
 */
const consumeEvents = async (groupId, topics, handler) => {
  const consumer = kafka.consumer({ groupId });
  await consumer.connect();
  for (const topic of topics) {
    await consumer.subscribe({ topic, fromBeginning: false });
  }
  await consumer.run({
    eachMessage: async ({ topic, message }) => {
      try {
        const payload = JSON.parse(message.value.toString());
        await handler(topic, payload);
      } catch (err) {
        console.error(`[Kafka] Error handling ${topic}:`, err.message);
      }
    },
  });
  console.log(`✅ [Kafka] Consumer "${groupId}" listening on: ${topics.join(', ')}`);
};

// ── Disconnect ────────────────────────────────────
const disconnectProducer = async () => {
  if (_producer) { await _producer.disconnect(); _producer = null; }
};

module.exports = { kafka, getProducer, publishEvent, consumeEvents, disconnectProducer };
