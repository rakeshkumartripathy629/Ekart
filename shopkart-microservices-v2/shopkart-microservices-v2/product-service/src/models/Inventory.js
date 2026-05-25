const mongoose = require('mongoose');
const inventorySchema = new mongoose.Schema({product:{type:mongoose.Schema.Types.ObjectId,ref:'Product',required:true},variant:{type:String,default:''},type:{type:String,enum:['restock','sale','return','adjustment','damage'],required:true},quantity:{type:Number,required:true},stockBefore:Number,stockAfter:Number,reason:String,reference:String,performedBy:{type:mongoose.Schema.Types.ObjectId}},{timestamps:true});
inventorySchema.index({product:1,createdAt:-1});
module.exports=mongoose.model('Inventory',inventorySchema);
