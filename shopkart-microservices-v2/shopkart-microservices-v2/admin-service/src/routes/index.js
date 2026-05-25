const r=require('express').Router();
r.use('/admin',require('./admin.routes'));
module.exports=r;
