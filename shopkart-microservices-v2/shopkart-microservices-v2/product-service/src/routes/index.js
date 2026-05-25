const r=require('express').Router();
r.use('/products',require('./product.routes'));
r.use('/categories',require('./category.routes'));
r.use('/products',require('./internal.routes'));
module.exports=r;
