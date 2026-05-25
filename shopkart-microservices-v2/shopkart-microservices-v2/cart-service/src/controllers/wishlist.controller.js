const Wishlist = require('../models/Wishlist');
const Cart = require('../models/Cart');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');
const axios = require('axios');
const productServiceUrl = process.env.PRODUCT_SERVICE_URL || 'http://product-service:3002';
exports.getWishlist = asyncHandler(async (req,res) => {
  const userId = req.headers['x-user-id'];
  const wishlist = await Wishlist.findOne({user:userId});
  if(!wishlist) return ApiResponse.success(res,'Wishlist empty',{wishlist:{products:[],count:0}});
  ApiResponse.success(res,'Wishlist fetched',{wishlist});
});
exports.toggleWishlist = asyncHandler(async (req,res) => {
  const userId = req.headers['x-user-id'];
  let wishlist = await Wishlist.findOne({user:userId});
  if(!wishlist) wishlist = await Wishlist.create({user:userId,products:[]});
  const { productId } = req.params;
  const exists = wishlist.products.some(id=>id.toString()===productId);
  if(exists) wishlist.products=wishlist.products.filter(id=>id.toString()!==productId);
  else wishlist.products.push(productId);
  await wishlist.save();
  ApiResponse.success(res,exists?'Removed from wishlist':'Added to wishlist',{added:!exists,count:wishlist.products.length});
});
exports.checkWishlist = asyncHandler(async (req,res) => {
  const userId = req.headers['x-user-id'];
  const wishlist = await Wishlist.findOne({user:userId});
  const isWishlisted = wishlist?.products.some(id=>id.toString()===req.params.productId)||false;
  ApiResponse.success(res,'Checked',{isWishlisted});
});
exports.moveAllToCart = asyncHandler(async (req,res) => {
  const userId = req.headers['x-user-id'];
  const wishlist = await Wishlist.findOne({user:userId});
  if(!wishlist||!wishlist.products.length) throw ApiError.badRequest('Wishlist empty');
  let cart = await Cart.findOne({user:userId});
  if(!cart) cart = await Cart.create({user:userId,items:[]});
  let added=0;
  for(const productId of wishlist.products){
    try{
      const res2 = await axios.get(`${productServiceUrl}/api/products/${productId}`);
      const product = res2.data.product;
      if(!product.isActive||product.stock<1) continue;
      const exists = cart.items.find(i=>i.product.toString()===productId.toString());
      if(!exists){ cart.items.push({product:productId,name:product.name,emoji:product.emoji,brand:product.brand,image:product.images?.[0]||'',price:product.price,mrp:product.mrp,qty:1,variant:'',seller:product.seller}); added++; }
    }catch{continue;}
  }
  await cart.save();
  ApiResponse.success(res,`${added} item(s) moved to cart`,{cart,itemCount:cart.itemCount});
});
exports.clearWishlist = asyncHandler(async (req,res) => {
  const userId = req.headers['x-user-id'];
  await Wishlist.findOneAndUpdate({user:userId},{products:[]});
  ApiResponse.success(res,'Wishlist cleared');
});
