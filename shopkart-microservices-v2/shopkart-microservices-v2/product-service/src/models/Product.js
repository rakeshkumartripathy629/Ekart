const mongoose = require('mongoose');
const { generateSlug } = require('../utils/generateSlug');
const variantSchema = new mongoose.Schema({label:{type:String,required:true},type:{type:String,required:true},priceModifier:{type:Number,default:0},stock:{type:Number,default:0},sku:String},{_id:true});
const reviewSchema = new mongoose.Schema({user:{type:mongoose.Schema.Types.ObjectId,required:true},name:String,avatar:String,rating:{type:Number,required:true,min:1,max:5},title:String,comment:String,images:[String],helpful:{type:Number,default:0}},{timestamps:true});
const productSchema = new mongoose.Schema({
  name:{type:String,required:true,trim:true},slug:{type:String,unique:true,lowercase:true},
  brand:{type:String,required:true},category:{type:mongoose.Schema.Types.ObjectId,ref:'Category',required:true},
  description:{type:String,required:true},emoji:{type:String,default:'📦'},images:[String],
  price:{type:Number,required:true},mrp:{type:Number,required:true},discount:{type:Number,default:0},
  stock:{type:Number,default:0},sku:String,seller:{type:String,default:'ShopKart Official'},
  variants:[variantSchema],features:[String],tags:[String],specifications:{type:Map,of:String},
  rating:{type:Number,default:0},numReviews:{type:Number,default:0},reviews:[reviewSchema],
  isFeatured:{type:Boolean,default:false},isNew:{type:Boolean,default:false},
  isBestSeller:{type:Boolean,default:false},isTrending:{type:Boolean,default:false},
  deliveryDays:{type:Number,default:2},freeDelivery:{type:Boolean,default:false},
  isActive:{type:Boolean,default:true},totalSold:{type:Number,default:0},
},{timestamps:true});
productSchema.pre('save',function(next){
  if(this.isNew||this.isModified('name'))this.slug=generateSlug(this.name);
  if(this.mrp&&this.price)this.discount=Math.round(((this.mrp-this.price)/this.mrp)*100);
  next();
});
productSchema.index({name:'text',brand:'text',description:'text',tags:'text'});
productSchema.index({category:1,isActive:1});productSchema.index({price:1});productSchema.index({rating:-1});
module.exports=mongoose.model('Product',productSchema);
