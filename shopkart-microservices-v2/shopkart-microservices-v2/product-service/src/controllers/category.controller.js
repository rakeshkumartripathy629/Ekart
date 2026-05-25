const Category = require('../models/Category');
const Product = require('../models/Product');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');
exports.getCategories = asyncHandler(async (req,res) => {
  const query = {isActive:true};
  if(req.query.parent==='null'||req.query.parent==='root') query.parent=null;
  else if(req.query.parent) query.parent=req.query.parent;
  const categories = await Category.find(query).sort({sortOrder:1,name:1});
  ApiResponse.success(res,'Categories fetched',{categories});
});
exports.getCategory = asyncHandler(async (req,res) => {
  const filter = req.params.id.match(/^[a-f\d]{24}$/i)?{_id:req.params.id}:{slug:req.params.id};
  const category = await Category.findOne({...filter,isActive:true});
  if(!category) throw ApiError.notFound('Category not found');
  const productCount = await Product.countDocuments({category:category._id,isActive:true});
  ApiResponse.success(res,'Category fetched',{category,productCount});
});
exports.createCategory = asyncHandler(async (req,res) => {
  const data={...req.body};
  if(req.file) data.image=`/uploads/banners/${req.file.filename}`;
  const category = await Category.create(data);
  ApiResponse.created(res,'Category created',{category});
});
exports.updateCategory = asyncHandler(async (req,res) => {
  const data={...req.body};
  if(req.file) data.image=`/uploads/banners/${req.file.filename}`;
  const category = await Category.findByIdAndUpdate(req.params.id,data,{new:true,runValidators:true});
  if(!category) throw ApiError.notFound('Category not found');
  ApiResponse.success(res,'Category updated',{category});
});
exports.deleteCategory = asyncHandler(async (req,res) => {
  const count = await Product.countDocuments({category:req.params.id,isActive:true});
  if(count>0) throw ApiError.badRequest(`Cannot delete: ${count} products in this category`);
  await Category.findByIdAndUpdate(req.params.id,{isActive:false});
  ApiResponse.success(res,'Category deleted');
});
