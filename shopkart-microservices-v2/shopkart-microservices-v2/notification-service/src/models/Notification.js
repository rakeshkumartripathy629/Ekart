const mongoose = require('mongoose');
const notificationSchema = new mongoose.Schema({user:{type:mongoose.Schema.Types.ObjectId,required:true},type:{type:String,enum:['order','payment','delivery','promo','wishlist','system','support'],default:'system'},title:{type:String,required:true},message:{type:String,required:true},icon:{type:String,default:'🔔'},isRead:{type:Boolean,default:false},link:String,meta:{type:Map,of:String}},{timestamps:true});
notificationSchema.index({user:1,isRead:1});notificationSchema.index({createdAt:-1});
module.exports=mongoose.model('Notification',notificationSchema);
