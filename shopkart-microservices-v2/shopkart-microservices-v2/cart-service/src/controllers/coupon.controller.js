const Coupon = require('../models/Coupon');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');
exports.validateCoupon = asyncHandler(async (req,res) => {
  const { code, cartTotal } = req.body;
  const coupon = await Coupon.findOne({code:code.toUpperCase(),isActive:true});
  if(!coupon) throw ApiError.notFound('Invalid coupon code');
  if(coupon.validTill&&coupon.validTill<new Date()) throw ApiError.badRequest('Coupon expired');
  if(coupon.usageLimit&&coupon.usedCount>=coupon.usageLimit) throw ApiError.badRequest('Usage limit reached');
  if(cartTotal<coupon.minOrderValue) throw ApiError.badRequest(`Min order INR ${coupon.minOrderValue} required`);
  let discountAmount = coupon.discountType==='flat' ? coupon.discountValue : Math.min(Math.round((cartTotal*coupon.discountValue)/100),coupon.maxDiscount||Infinity);
  ApiResponse.success(res,'Coupon valid',{coupon,discountAmount});
});
exports.getAllCoupons = asyncHandler(async (req,res) => {
  const coupons = await Coupon.find().sort({createdAt:-1});
  ApiResponse.success(res,'Coupons fetched',{coupons});
});
exports.createCoupon = asyncHandler(async (req,res) => {
  if(await Coupon.findOne({code:req.body.code.toUpperCase()})) throw ApiError.conflict('Code already exists');
  const coupon = await Coupon.create({...req.body,code:req.body.code.toUpperCase()});
  ApiResponse.created(res,'Coupon created',{coupon});
});
exports.updateCoupon = asyncHandler(async (req,res) => {
  const coupon = await Coupon.findByIdAndUpdate(req.params.id,req.body,{new:true,runValidators:true});
  if(!coupon) throw ApiError.notFound('Coupon not found');
  ApiResponse.success(res,'Coupon updated',{coupon});
});
exports.deleteCoupon = asyncHandler(async (req,res) => {
  await Coupon.findByIdAndDelete(req.params.id);
  ApiResponse.success(res,'Coupon deleted');
});
exports.toggleCoupon = asyncHandler(async (req,res) => {
  const coupon = await Coupon.findById(req.params.id);
  if(!coupon) throw ApiError.notFound('Coupon not found');
  coupon.isActive=!coupon.isActive;
  await coupon.save();
  ApiResponse.success(res,`Coupon ${coupon.isActive?'activated':'deactivated'}`,{coupon});
});
