const router=require('express').Router();
const Order=require('../models/Order');
const ApiResponse=require('../utils/ApiResponse');
const asyncHandler=require('../utils/asyncHandler');
const {protect}=require('../middleware/auth.middleware');
const {adminOnly}=require('../middleware/admin.middleware');
router.get('/admin/all',protect,adminOnly,asyncHandler(async(req,res)=>{
  const {status,search,paymentStatus}=req.query;
  const page=+req.query.page||1;const limit=+req.query.limit||20;const skip=(page-1)*limit;
  const q={};
  if(status)q.status=status;if(paymentStatus)q.paymentStatus=paymentStatus;
  if(search)q.$or=[{orderId:{$regex:search,$options:'i'}},{'shippingAddress.fullName':{$regex:search,$options:'i'}}];
  const [total,data]=await Promise.all([Order.countDocuments(q),Order.find(q).sort({createdAt:-1}).skip(skip).limit(limit)]);
  ApiResponse.paginated(res,'Orders fetched',{data,total,page,limit});
}));
router.get('/admin/analytics',protect,adminOnly,asyncHandler(async(req,res)=>{
  const days=+(req.query.period||30);
  const start=new Date(Date.now()-days*24*60*60*1000);
  const [salesByDay,orderStatusDist]=await Promise.all([
    Order.aggregate([{$match:{createdAt:{$gte:start},paymentStatus:'paid'}},{$group:{_id:{$dateToString:{format:'%Y-%m-%d',date:'$createdAt'}},revenue:{$sum:'$total'},orders:{$sum:1}}},{$sort:{_id:1}}]),
    Order.aggregate([{$group:{_id:'$status',count:{$sum:1}}}]),
  ]);
  ApiResponse.success(res,'Analytics',{salesByDay,orderStatusDist});
}));
module.exports=router;
