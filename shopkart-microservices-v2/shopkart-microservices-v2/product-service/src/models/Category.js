const mongoose = require('mongoose');
const { generateSlug } = require('../utils/generateSlug');
const categorySchema = new mongoose.Schema({name:{type:String,required:true,unique:true,trim:true},slug:{type:String,unique:true,lowercase:true},emoji:{type:String,default:'🏷️'},image:{type:String,default:''},description:String,parent:{type:mongoose.Schema.Types.ObjectId,ref:'Category',default:null},isActive:{type:Boolean,default:true},sortOrder:{type:Number,default:0}},{timestamps:true});
categorySchema.pre('save',function(next){if(!this.slug||this.isModified('name'))this.slug=generateSlug(this.name);next();});
module.exports=mongoose.model('Category',categorySchema);
