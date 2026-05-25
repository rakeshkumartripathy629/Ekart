const Product = require('../models/Product');
const Category = require('../models/Category');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');
const { getPagination } = require('../utils/pagination');

exports.getProducts = asyncHandler(async (req, res) => {
  const { search,category,brand,minPrice,maxPrice,rating,sort,featured,newArrival,bestSeller,trending,inStock } = req.query;
  const { page, limit, skip } = getPagination(req.query);
  const query = { isActive: true };
  if (search) query.$text = { $search: search };
  if (category) { const cat = await Category.findOne({ $or:[{slug:category},...(category.match(/^[a-f\d]{24}$/i)?[{_id:category}]:[])] }); if(cat)query.category=cat._id; }
  if (brand) query.brand = { $regex:brand,$options:'i' };
  if (minPrice||maxPrice) { query.price={}; if(minPrice)query.price.$gte=+minPrice; if(maxPrice)query.price.$lte=+maxPrice; }
  if (rating) query.rating = { $gte:+rating };
  if (featured==='true') query.isFeatured=true;
  if (newArrival==='true') query.isNew=true;
  if (bestSeller==='true') query.isBestSeller=true;
  if (trending==='true') query.isTrending=true;
  if (inStock==='true') query.stock={ $gt:0 };
  const sortMap = {price_asc:{price:1},price_desc:{price:-1},rating:{rating:-1},newest:{createdAt:-1},popular:{totalSold:-1},discount:{discount:-1}};
  const sortBy = sortMap[sort] || {isFeatured:-1,totalSold:-1};
  const [total,data] = await Promise.all([Product.countDocuments(query),Product.find(query).sort(sortBy).skip(skip).limit(limit).populate('category','name slug emoji').select('-reviews')]);
  ApiResponse.paginated(res,'Products fetched',{data,total,page,limit});
});

exports.getFeaturedProducts = asyncHandler(async (req, res) => {
  const [featured,newArrivals,bestSellers,trending] = await Promise.all([
    Product.find({isActive:true,isFeatured:true}).limit(8).select('-reviews').populate('category','name slug'),
    Product.find({isActive:true,isNew:true}).sort({createdAt:-1}).limit(8).select('-reviews'),
    Product.find({isActive:true,isBestSeller:true}).sort({totalSold:-1}).limit(8).select('-reviews'),
    Product.find({isActive:true,isTrending:true}).limit(8).select('-reviews'),
  ]);
  ApiResponse.success(res,'Featured products',{featured,newArrivals,bestSellers,trending});
});

exports.getProduct = asyncHandler(async (req, res) => {
  const filter = req.params.id.match(/^[a-f\d]{24}$/i)?{_id:req.params.id}:{slug:req.params.id};
  const product = await Product.findOne({...filter,isActive:true}).populate('category','name slug emoji').populate('reviews.user','name avatar');
  if(!product) throw ApiError.notFound('Product not found');
  const related = await Product.find({category:product.category._id,_id:{$ne:product._id},isActive:true}).limit(6).select('-reviews');
  ApiResponse.success(res,'Product fetched',{product,related});
});

exports.createProduct = asyncHandler(async (req, res) => {
  const data = {...req.body};
  if(req.files?.length) data.images = req.files.map(f=>`/uploads/products/${f.filename}`);
  const product = await Product.create(data);
  await product.populate('category','name slug');
  ApiResponse.created(res,'Product created',{product});
});

exports.updateProduct = asyncHandler(async (req, res) => {
  const data = {...req.body};
  if(req.files?.length) data.images = req.files.map(f=>`/uploads/products/${f.filename}`);
  const product = await Product.findByIdAndUpdate(req.params.id,data,{new:true,runValidators:true}).populate('category','name slug');
  if(!product) throw ApiError.notFound('Product not found');
  ApiResponse.success(res,'Product updated',{product});
});

exports.deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findByIdAndUpdate(req.params.id,{isActive:false},{new:true});
  if(!product) throw ApiError.notFound('Product not found');
  ApiResponse.success(res,'Product removed');
});

exports.addReview = asyncHandler(async (req, res) => {
  const { rating, title, comment } = req.body;
  const product = await Product.findById(req.params.id);
  if(!product) throw ApiError.notFound('Product not found');
  const userId = req.headers['x-user-id'];
  if(product.reviews.find(r=>r.user.toString()===userId)) throw ApiError.conflict('Already reviewed');
  const images = req.files?.map(f=>`/uploads/products/${f.filename}`) || [];
  product.reviews.push({user:userId,name:req.user?.name||'User',rating:+rating,title,comment,images});
  product.numReviews=product.reviews.length;
  product.rating=+(product.reviews.reduce((s,r)=>s+r.rating,0)/product.numReviews).toFixed(1);
  await product.save();
  ApiResponse.created(res,'Review submitted',{rating:product.rating,numReviews:product.numReviews});
});

exports.deleteReview = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if(!product) throw ApiError.notFound('Product not found');
  const review = product.reviews.id(req.params.reviewId);
  if(!review) throw ApiError.notFound('Review not found');
  const userId = req.headers['x-user-id'];
  const role = req.headers['x-user-role'];
  if(review.user.toString()!==userId&&role!=='admin') throw ApiError.forbidden('Not authorized');
  product.reviews=product.reviews.filter(r=>r._id.toString()!==req.params.reviewId);
  product.numReviews=product.reviews.length;
  product.rating=product.numReviews?+(product.reviews.reduce((s,r)=>s+r.rating,0)/product.numReviews).toFixed(1):0;
  await product.save();
  ApiResponse.success(res,'Review deleted');
});
