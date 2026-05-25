const r=require('express').Router();
r.use('/orders',require('./order.routes'));
r.use('/orders',require('./admin.routes'));
module.exports=r;
