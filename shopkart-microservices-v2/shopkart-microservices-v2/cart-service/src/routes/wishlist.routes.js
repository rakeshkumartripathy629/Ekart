const router=require('express').Router();
const ctrl=require('../controllers/wishlist.controller');
const {protect}=require('../middleware/auth.middleware');
router.use(protect);
router.get('/',ctrl.getWishlist);router.post('/toggle/:productId',ctrl.toggleWishlist);
router.get('/check/:productId',ctrl.checkWishlist);router.post('/move-to-cart',ctrl.moveAllToCart);
router.delete('/clear',ctrl.clearWishlist);module.exports=router;
