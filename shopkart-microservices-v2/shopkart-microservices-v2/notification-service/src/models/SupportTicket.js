const mongoose = require('mongoose');
const messageSchema = new mongoose.Schema({sender:{type:String,enum:['user','admin'],required:true},message:{type:String,required:true},attachments:[String]},{timestamps:true});
const supportSchema = new mongoose.Schema({
  ticketId:{type:String,unique:true,default:()=>`TKT${Date.now()}`},
  user:{type:mongoose.Schema.Types.ObjectId,required:true},
  order:{type:mongoose.Schema.Types.ObjectId},
  subject:{type:String,required:true},
  category:{type:String,enum:['order_issue','payment','delivery','return_refund','product','account','other'],default:'other'},
  priority:{type:String,enum:['low','medium','high'],default:'medium'},
  status:{type:String,enum:['open','in_progress','resolved','closed'],default:'open'},
  messages:[messageSchema],
  assignedTo:{type:mongoose.Schema.Types.ObjectId},
  resolvedAt:Date,
},{timestamps:true});
supportSchema.index({user:1});supportSchema.index({status:1});
module.exports=mongoose.model('SupportTicket',supportSchema);
