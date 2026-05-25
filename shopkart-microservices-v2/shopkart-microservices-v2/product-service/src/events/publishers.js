const { publishEvent } = require('../../shared/kafka/kafkaClient');
const TOPICS = require('../../shared/kafka/topics');
exports.publishLowStock = async (product) => {
  await publishEvent(TOPICS.INVENTORY_LOW_STOCK, {
    productId: product._id.toString(), name: product.name, stock: product.stock,
  });
};
