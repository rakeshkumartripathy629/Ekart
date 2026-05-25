const r=require('express').Router();
r.use('/auth',require('./auth.routes'));
r.use('/users',require('./user.routes'));
module.exports=r;
