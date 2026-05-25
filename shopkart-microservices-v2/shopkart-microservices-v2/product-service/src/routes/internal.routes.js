const router=require('express').Router();
const Product=require('../models/Product');
const Inventory=require('../models/Inventory');
const ApiResponse=require('../utils/ApiResponse');
const asyncHandler=require('../utils/asyncHandler');
const {protect}=require('../middleware/auth.middleware');
const {adminOnly}=require('../middleware/admin.middleware');
router.get('/internal/stats',asyncHandler(async(req,res)=>{
  const total=await Product.countDocuments({isActive:true});
  ApiResponse.success(res,'Product stats',{total});
}));
router.get('/internal/low-stock',asyncHandler(async(req,res)=>{
  const threshold=+(req.query.threshold||10);
  const products=await Product.find({isActive:true,stock:{$lte:threshold}}).sort({stock:1}).select('name emoji brand stock');
  ApiResponse.success(res,'Low stock',{products});
}));
router.post('/internal/restock',protect,adminOnly,asyncHandler(async(req,res)=>{
  const {productId,variant,quantity,reason,performedBy}=req.body;
  const product=await Product.findById(productId);
  if(!product) return res.status(404).json({success:false,message:'Product not found'});
  const before=product.stock;
  product.stock+=+quantity;
  if(variant){const v=product.variants.find(vv=>vv.label===variant);if(v)v.stock+=+quantity;}
  await product.save({validateBeforeSave:false});
  const record=await Inventory.create({product:productId,variant:variant||'',type:'restock',quantity:+quantity,stockBefore:before,stockAfter:product.stock,reason:reason||'Manual restock',performedBy:req.headers['x-user-id']});
  ApiResponse.success(res,`Restocked ${quantity} units`,{record});
}));
router.get('/internal/logs/:productId',asyncHandler(async(req,res)=>{
  const logs=await Inventory.find({product:req.params.productId}).sort({createdAt:-1}).limit(50);
  ApiResponse.success(res,'Inventory logs',{logs});
}));
module.exports=router;
