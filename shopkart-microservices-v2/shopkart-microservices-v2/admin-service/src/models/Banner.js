const mongoose = require('mongoose');
const bannerSchema = new mongoose.Schema({title:{type:String,required:true},subtitle:String,image:{type:String,required:true},link:String,badge:String,badgeColor:{type:String,default:'#ff6b6b'},position:{type:String,enum:['hero','banner','popup','sidebar'],default:'hero'},sortOrder:{type:Number,default:0},isActive:{type:Boolean,default:true},validFrom:{type:Date,default:Date.now},validTill:Date},{timestamps:true});
module.exports=mongoose.model('Banner',bannerSchema);
