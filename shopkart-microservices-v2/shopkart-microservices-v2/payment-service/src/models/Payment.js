const mongoose = require('mongoose');
const paymentSchema = new mongoose.Schema({
  orderId:{type:String,required:true,unique:true},
  orderMongoId:{type:String},
  userId:{type:String,required:true},
  amount:{type:Number,required:true},currency:{type:String,default:'INR'},
  method:{type:String,enum:['upi','card','netbanking','cod','emi','shopkart_pay'],required:true},
  gatewayOrderId:String,gatewayPaymentId:String,gatewaySignature:String,
  status:{type:String,enum:['pending','initiated','success','failed','refund_initiated','refunded'],default:'initiated'},
  upiId:String,cardLast4:String,cardBrand:String,
  refundAmount:Number,refundId:String,refundedAt:Date,
  failureReason:String,metadata:{type:Map,of:String},
},{timestamps:true});
paymentSchema.index({orderId:1});paymentSchema.index({userId:1});paymentSchema.index({status:1});
module.exports=mongoose.model('Payment',paymentSchema);
