// Shared package entry point
module.exports = {
  kafka: require('./kafka/kafkaClient'),
  topics: require('./kafka/topics'),
  rabbitmq: require('./rabbitmq/rabbitmqClient'),
  queues: require('./rabbitmq/queues'),
  ApiError: require('./utils/ApiError'),
  ApiResponse: require('./utils/ApiResponse'),
  asyncHandler: require('./utils/asyncHandler'),
};
