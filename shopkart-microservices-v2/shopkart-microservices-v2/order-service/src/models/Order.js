const mongoose = require('mongoose');
const orderItemSchema = new mongoose.Schema({product:{type:mongoose.Schema.Types.ObjectId},name:{type:String,required:true},emoji:String,brand:String,image:String,price:{type:Number,required:true},mrp:Number,qty:{type:Number,required:true,min:1},variant:String,seller:String});
const trackingSchema = new mongoose.Schema({status:{type:String,required:true},description:String,location:String,time:{type:Date,default:Date.now}});
const ORDER_STATUSES=['placed','confirmed','packed','shipped','out_for_delivery','delivered','cancelled','returned','refunded'];
const orderSchema = new mongoose.Schema({
  orderId:{type:String,unique:true,default:()=>`SK${Date.now()}${Math.floor(Math.random()*1000)}`},
  user:{type:mongoose.Schema.Types.ObjectId,required:true},
  items:[orderItemSchema],
  shippingAddress:{fullName:{type:String,required:true},phone:{type:String,required:true},addressLine1:{type:String,required:true},addressLine2:String,city:{type:String,required:true},state:{type:String,required:true},pincode:{type:String,required:true},landmark:String},
  subtotal:Number,mrpTotal:Number,discount:{type:Number,default:0},deliveryCharge:{type:Number,default:0},
  couponCode:String,couponDiscount:{type:Number,default:0},total:{type:Number,required:true},
  paymentMethod:{type:String,enum:['upi','card','netbanking','cod','emi','shopkart_pay'],required:true},
  paymentStatus:{type:String,enum:['pending','initiated','paid','failed','refunded'],default:'pending'},
  transactionId:String,
  status:{type:String,enum:ORDER_STATUSES,default:'placed'},
  carrier:{type:String,default:'Blue Dart'},awb:String,
  estimatedDelivery:Date,deliveredAt:Date,
  tracking:[trackingSchema],
  notes:String,cancelReason:String,returnReason:String,isReviewed:{type:Boolean,default:false},
},{timestamps:true});
orderSchema.pre('save',function(next){
  if(this.isNew&&this.tracking.length===0) this.tracking.push({status:'Order Placed',description:'Your order has been confirmed successfully.'});
  next();
});
orderSchema.index({user:1,createdAt:-1});orderSchema.index({orderId:1});orderSchema.index({status:1});
module.exports=mongoose.model('Order',orderSchema);
