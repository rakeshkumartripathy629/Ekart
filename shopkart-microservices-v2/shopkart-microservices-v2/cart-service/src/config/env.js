module.exports = {
  port: process.env.PORT || 3003,
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/shopkart_cart',
  jwt: { secret: process.env.JWT_SECRET || 'shopkart_secret', accessExpires: '7d', refreshExpires: '30d' },
  kafka: { brokers: (process.env.KAFKA_BROKERS || 'kafka:9092').split(','), clientId: process.env.KAFKA_CLIENT_ID || 'shopkart-cart-service' },
  rabbitmq: { url: process.env.RABBITMQ_URL || 'amqp://shopkart:shopkart123@rabbitmq:5672/shopkart' },
  redis: { url: process.env.REDIS_URL || 'redis://:shopkart123@redis:6379' },
};
