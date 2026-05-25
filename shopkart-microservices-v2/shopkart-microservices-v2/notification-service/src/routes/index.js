const r=require('express').Router();
r.use('/notifications',require('./notification.routes'));
r.use('/support',require('./support.routes'));
module.exports=r;
