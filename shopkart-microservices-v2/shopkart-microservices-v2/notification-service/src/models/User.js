const mongoose = require('mongoose');
// Minimal User model for notification-service (only _id, role, email needed)
const userSchema = new mongoose.Schema({role:{type:String,enum:['user','admin'],default:'user'},email:String,name:String},{strict:false});
module.exports=mongoose.model('User',userSchema);
