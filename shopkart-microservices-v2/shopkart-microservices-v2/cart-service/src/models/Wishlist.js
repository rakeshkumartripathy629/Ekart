const mongoose = require('mongoose');
const wishlistSchema = new mongoose.Schema({user:{type:mongoose.Schema.Types.ObjectId,required:true,unique:true},products:[{type:mongoose.Schema.Types.ObjectId}]},{timestamps:true});
wishlistSchema.virtual('count').get(function(){return this.products.length;});
wishlistSchema.set('toJSON',{virtuals:true});
module.exports=mongoose.model('Wishlist',wishlistSchema);
