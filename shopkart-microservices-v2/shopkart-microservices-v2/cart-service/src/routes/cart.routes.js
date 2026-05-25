const router=require('express').Router();
const ctrl=require('../controllers/cart.controller');
const {protect}=require('../middleware/auth.middleware');
router.use(protect);
router.get('/',ctrl.getCart);router.post('/add',ctrl.addToCart);router.put('/update',ctrl.updateQty);
router.delete('/item/:itemId',ctrl.removeItem);router.delete('/clear',ctrl.clearCart);
router.post('/coupon/apply',ctrl.applyCoupon);router.delete('/coupon/remove',ctrl.removeCoupon);
module.exports=router;
