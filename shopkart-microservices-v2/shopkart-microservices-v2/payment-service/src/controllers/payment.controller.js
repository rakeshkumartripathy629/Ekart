const Payment = require('../models/Payment');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');
const { publishEvent } = require('../../shared/kafka/kafkaClient');
const TOPICS = require('../../shared/kafka/topics');
const { publishJob } = require('../../shared/rabbitmq/rabbitmqClient');
const QUEUES = require('../../shared/rabbitmq/queues');
const { getPagination } = require('../utils/pagination');

exports.getPayment = asyncHandler(async (req,res) => {
  const payment = await Payment.findOne({orderId:req.params.orderId});
  if(!payment) throw ApiError.notFound('Payment not found');
  ApiResponse.success(res,'Payment details',{payment});
});

exports.confirmPayment = asyncHandler(async (req,res) => {
  const { orderId, orderMongoId, gatewayPaymentId, gatewayOrderId, gatewaySignature } = req.body;
  await Payment.findOneAndUpdate({orderId},{status:'success',gatewayPaymentId,gatewayOrderId,gatewaySignature});
  await publishEvent(TOPICS.PAYMENT_CONFIRMED,{orderId,orderMongoId,transactionId:gatewayPaymentId},orderId);
  ApiResponse.success(res,'Payment confirmed');
});

exports.failPayment = asyncHandler(async (req,res) => {
  const { orderId, orderMongoId, reason } = req.body;
  await Payment.findOneAndUpdate({orderId},{status:'failed',failureReason:reason});
  await publishEvent(TOPICS.PAYMENT_FAILED,{orderId,orderMongoId},orderId);
  ApiResponse.success(res,'Payment marked failed');
});

exports.refundPayment = asyncHandler(async (req,res) => {
  const { orderId, orderMongoId, refundId, refundAmount } = req.body;
  await Payment.findOneAndUpdate({orderId},{status:'refunded',refundId,refundAmount,refundedAt:new Date()});
  await publishEvent(TOPICS.PAYMENT_REFUNDED,{orderId,orderMongoId,refundId,refundAmount,userId:req.headers['x-user-id']},orderId);
  await publishJob(QUEUES.EMAIL_REFUND,{orderId,refundAmount,userId:req.headers['x-user-id']});
  ApiResponse.success(res,'Refund processed');
});

exports.getAllPayments = asyncHandler(async (req,res) => {
  const { status, method } = req.query;
  const { page, limit, skip } = getPagination(req.query);
  const query={};
  if(status) query.status=status;
  if(method) query.method=method;
  const [total,data] = await Promise.all([Payment.countDocuments(query),Payment.find(query).sort({createdAt:-1}).skip(skip).limit(limit)]);
  ApiResponse.paginated(res,'Payments fetched',{data,total,page,limit});
});
