const r=require('express').Router();
r.use('/cart',require('./cart.routes'));
r.use('/wishlist',require('./wishlist.routes'));
r.use('/coupons',require('./coupon.routes'));
module.exports=r;
