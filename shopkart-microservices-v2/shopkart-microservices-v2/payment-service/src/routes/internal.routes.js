const router=require('express').Router();
const Payment=require('../models/Payment');
const ApiResponse=require('../utils/ApiResponse');
const asyncHandler=require('../utils/asyncHandler');
router.get('/internal/stats',asyncHandler(async(req,res)=>{
  const [result]=await Payment.aggregate([{$match:{status:'success'}},{$group:{_id:null,totalRevenue:{$sum:'$amount'},avg:{$avg:'$amount'}}}]);
  ApiResponse.success(res,'Stats',{totalRevenue:result?.totalRevenue||0,avgOrder:result?.avg||0});
}));
router.get('/internal/analytics',asyncHandler(async(req,res)=>{
  const paymentMethods=await Payment.aggregate([{$group:{_id:'$method',count:{$sum:1},revenue:{$sum:'$amount'}}}]);
  ApiResponse.success(res,'Payment analytics',{paymentMethods});
}));
module.exports=router;
