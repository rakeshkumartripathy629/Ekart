const Notification = require('../models/Notification');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');
exports.getNotifications = asyncHandler(async (req,res) => {
  const userId = req.headers['x-user-id'];
  const notifications = await Notification.find({user:userId}).sort({createdAt:-1}).limit(50);
  const unreadCount = await Notification.countDocuments({user:userId,isRead:false});
  ApiResponse.success(res,'Notifications fetched',{notifications,unreadCount});
});
exports.markAllRead = asyncHandler(async (req,res) => {
  const userId = req.headers['x-user-id'];
  await Notification.updateMany({user:userId,isRead:false},{isRead:true});
  ApiResponse.success(res,'All marked as read');
});
exports.markRead = asyncHandler(async (req,res) => {
  const userId = req.headers['x-user-id'];
  const n = await Notification.findOneAndUpdate({_id:req.params.id,user:userId},{isRead:true},{new:true});
  if(!n) throw ApiError.notFound('Notification not found');
  ApiResponse.success(res,'Marked as read',{notification:n});
});
exports.deleteNotification = asyncHandler(async (req,res) => {
  const userId = req.headers['x-user-id'];
  await Notification.findOneAndDelete({_id:req.params.id,user:userId});
  ApiResponse.success(res,'Notification deleted');
});
exports.clearAll = asyncHandler(async (req,res) => {
  const userId = req.headers['x-user-id'];
  await Notification.deleteMany({user:userId});
  ApiResponse.success(res,'All notifications cleared');
});
