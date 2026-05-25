const r=require('express').Router();
r.use('/payments',require('./payment.routes'));
r.use('/payments',require('./internal.routes'));
module.exports=r;
