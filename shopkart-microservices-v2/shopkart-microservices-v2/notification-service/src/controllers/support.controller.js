const SupportTicket = require('../models/SupportTicket');
const Notification = require('../models/Notification');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');
const { getPagination } = require('../utils/pagination');
exports.createTicket = asyncHandler(async (req,res) => {
  const { subject, category, orderId, message } = req.body;
  const userId = req.headers['x-user-id'];
  const ticket = await SupportTicket.create({user:userId,order:orderId||undefined,subject,category:category||'other',messages:[{sender:'user',message}]});
  ApiResponse.created(res,'Ticket created. We respond within 24 hours.',{ticket});
});
exports.getMyTickets = asyncHandler(async (req,res) => {
  const userId = req.headers['x-user-id'];
  const { status } = req.query;
  const { page, limit, skip } = getPagination(req.query);
  const query = {user:userId};
  if(status) query.status=status;
  const [total,data] = await Promise.all([SupportTicket.countDocuments(query),SupportTicket.find(query).sort({createdAt:-1}).skip(skip).limit(limit)]);
  ApiResponse.paginated(res,'Tickets fetched',{data,total,page,limit});
});
exports.getTicket = asyncHandler(async (req,res) => {
  const userId = req.headers['x-user-id'];
  const role = req.headers['x-user-role'];
  const ticket = await SupportTicket.findById(req.params.id);
  if(!ticket) throw ApiError.notFound('Ticket not found');
  if(ticket.user.toString()!==userId&&role!=='admin') throw ApiError.forbidden('Not authorized');
  ApiResponse.success(res,'Ticket fetched',{ticket});
});
exports.replyTicket = asyncHandler(async (req,res) => {
  const userId = req.headers['x-user-id'];
  const role = req.headers['x-user-role'];
  const ticket = await SupportTicket.findById(req.params.id);
  if(!ticket) throw ApiError.notFound('Ticket not found');
  if(ticket.user.toString()!==userId&&role!=='admin') throw ApiError.forbidden('Not authorized');
  if(ticket.status==='closed') throw ApiError.badRequest('Ticket is closed');
  ticket.messages.push({sender:role==='admin'?'admin':'user',message:req.body.message});
  if(ticket.status==='resolved') ticket.status='in_progress';
  await ticket.save();
  ApiResponse.success(res,'Reply sent',{ticket});
});
exports.closeTicket = asyncHandler(async (req,res) => {
  const userId = req.headers['x-user-id'];
  const ticket = await SupportTicket.findOne({_id:req.params.id,user:userId});
  if(!ticket) throw ApiError.notFound('Ticket not found');
  ticket.status='closed'; await ticket.save();
  ApiResponse.success(res,'Ticket closed',{ticket});
});
exports.getAllTickets = asyncHandler(async (req,res) => {
  const { status, priority, category } = req.query;
  const { page, limit, skip } = getPagination(req.query);
  const query={};
  if(status) query.status=status; if(priority) query.priority=priority; if(category) query.category=category;
  const [total,data] = await Promise.all([SupportTicket.countDocuments(query),SupportTicket.find(query).sort({createdAt:-1}).skip(skip).limit(limit)]);
  ApiResponse.paginated(res,'Tickets fetched',{data,total,page,limit});
});
exports.updateTicketStatus = asyncHandler(async (req,res) => {
  const { status, priority, assignedTo } = req.body;
  const ticket = await SupportTicket.findByIdAndUpdate(req.params.id,{...(status&&{status}),...(priority&&{priority}),...(assignedTo&&{assignedTo}),...(status==='resolved'&&{resolvedAt:new Date()})},{new:true});
  if(!ticket) throw ApiError.notFound('Ticket not found');
  if(status==='resolved'){
    await Notification.create({user:ticket.user,type:'support',icon:'✅',title:'Support Ticket Resolved',message:`Your ticket "${ticket.subject}" has been resolved.`,link:`/support/${ticket._id}`});
  }
  ApiResponse.success(res,'Ticket updated',{ticket});
});
