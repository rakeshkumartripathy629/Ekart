const mongoose = require('mongoose');
const storeSettingSchema = new mongoose.Schema({key:{type:String,required:true,unique:true},value:{type:mongoose.Schema.Types.Mixed,required:true},label:String,group:{type:String,enum:['general','payment','delivery','email','social','seo'],default:'general'},isPublic:{type:Boolean,default:false}},{timestamps:true});
storeSettingSchema.statics.get=async function(key,fallback=null){const s=await this.findOne({key});return s?s.value:fallback;};
storeSettingSchema.statics.set=async function(key,value,meta={}){return this.findOneAndUpdate({key},{key,value,...meta},{upsert:true,new:true});};
module.exports=mongoose.model('StoreSetting',storeSettingSchema);
