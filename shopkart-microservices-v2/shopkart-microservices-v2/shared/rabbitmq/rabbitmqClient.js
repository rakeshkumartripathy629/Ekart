/**
 * SHARED — RabbitMQ Client
 * RabbitMQ is used for TASK QUEUES and RETRY-ABLE work:
 *   - Email sending (with DLQ for failed emails)
 *   - Payment processing retries
 *   - PDF generation, report jobs
 *   - Webhook delivery with retry
 *
 * Pattern: services publish jobs; workers consume and ack/nack.
 * Failed messages after maxRetries → Dead Letter Queue (DLQ).
 */
const amqplib = require('amqplib');

let _connection = null;
let _channel = null;

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://shopkart:shopkart123@rabbitmq:5672';

// ── Connect ───────────────────────────────────────
const connect = async () => {
  if (_channel) return _channel;
  _connection = await amqplib.connect(RABBITMQ_URL);
  _channel = await _connection.createChannel();

  // Prefetch 1 — process one message at a time per consumer
  await _channel.prefetch(1);

  console.log('✅ [RabbitMQ] Connected');

  _connection.on('error', (err) => {
    console.error('[RabbitMQ] Connection error:', err.message);
    _channel = null; _connection = null;
  });
  _connection.on('close', () => {
    console.warn('[RabbitMQ] Connection closed — will reconnect on next call');
    _channel = null; _connection = null;
  });

  return _channel;
};

// ── Assert queue with DLX ─────────────────────────
/**
 * Asserts a durable queue with a Dead Letter Exchange.
 * Failed messages (nack without requeue) go to DLQ automatically.
 */
const assertQueue = async (queueName, { maxRetries = 3 } = {}) => {
  const ch = await connect();
  const dlxName = `${queueName}.dlx`;
  const dlqName = `${queueName}.dlq`;

  // Dead Letter Exchange
  await ch.assertExchange(dlxName, 'direct', { durable: true });
  // Dead Letter Queue
  await ch.assertQueue(dlqName, { durable: true });
  await ch.bindQueue(dlqName, dlxName, queueName);

  // Main queue with DLX config
  await ch.assertQueue(queueName, {
    durable: true,
    arguments: {
      'x-dead-letter-exchange': dlxName,
      'x-dead-letter-routing-key': queueName,
      'x-message-ttl': 86400000, // 24h TTL
    },
  });

  return ch;
};

// ── Publish job ───────────────────────────────────
/**
 * @param {string} queue
 * @param {object} payload
 * @param {object} [options]  - amqplib publish options
 */
const publishJob = async (queue, payload, options = {}) => {
  const ch = await assertQueue(queue);
  ch.sendToQueue(
    queue,
    Buffer.from(JSON.stringify({ ...payload, _ts: Date.now() })),
    { persistent: true, ...options }
  );
};

// ── Consume jobs ──────────────────────────────────
/**
 * @param {string}   queue
 * @param {Function} handler  - async (payload) => void   — throw to nack
 * @param {number}   [maxRetries=3]
 */
const consumeJobs = async (queue, handler, maxRetries = 3) => {
  const ch = await assertQueue(queue, { maxRetries });
  ch.consume(queue, async (msg) => {
    if (!msg) return;
    let payload;
    try {
      payload = JSON.parse(msg.content.toString());
    } catch {
      ch.nack(msg, false, false); // malformed → DLQ immediately
      return;
    }

    const retryCount = (msg.properties.headers?.['x-retry-count'] || 0);

    try {
      await handler(payload);
      ch.ack(msg);
    } catch (err) {
      console.error(`[RabbitMQ] Job failed on queue "${queue}":`, err.message);
      if (retryCount < maxRetries) {
        // Re-queue with incremented retry count after exponential backoff header
        ch.nack(msg, false, false); // → DLQ (then retry logic can re-publish)
        // Simple retry: re-publish with delay simulation
        setTimeout(() => {
          try {
            ch.sendToQueue(
              queue,
              Buffer.from(JSON.stringify(payload)),
              {
                persistent: true,
                headers: { 'x-retry-count': retryCount + 1 },
              }
            );
          } catch { /* ignore */ }
        }, Math.pow(2, retryCount) * 1000); // 1s, 2s, 4s
      } else {
        console.error(`[RabbitMQ] Max retries (${maxRetries}) reached for "${queue}" — sending to DLQ`);
        ch.nack(msg, false, false); // → DLQ permanently
      }
    }
  });
  console.log(`✅ [RabbitMQ] Consumer on queue: "${queue}"`);
};

// ── Disconnect ────────────────────────────────────
const disconnect = async () => {
  try {
    if (_channel) await _channel.close();
    if (_connection) await _connection.close();
    _channel = null; _connection = null;
  } catch { /* ignore */ }
};

module.exports = { connect, publishJob, consumeJobs, assertQueue, disconnect };
