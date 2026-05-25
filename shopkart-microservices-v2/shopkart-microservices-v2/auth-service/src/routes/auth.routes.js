const router = require("express").Router();
const ctrl = require("../controllers/auth.controller");
const { protect } = require("../middleware/auth.middleware");
const validate = require("../middleware/validate.middleware");
const { body } = require("express-validator");
const registerV = [
  body("name").trim().notEmpty().withMessage("Name required"),
  body("email").isEmail().withMessage("Valid email required"),
  body("password").isLength({ min: 6 }).withMessage("Min 6 chars"),
];
const loginV = [
  body("email").isEmail().withMessage("Valid email required"),
  body("password").notEmpty().withMessage("Password required"),
];
router.post("/register", registerV, validate, ctrl.register);
router.post("/login", loginV, validate, ctrl.login);
router.post("/refresh-token", ctrl.refreshToken);
router.post("/forgot-password", ctrl.forgotPassword);
router.post("/reset-password", ctrl.resetPassword);
router.get("/me", protect, ctrl.getMe);
router.put("/update-profile", protect, ctrl.updateProfile);
router.put("/change-password", protect, ctrl.changePassword);
router.post("/address", protect, ctrl.addAddress);
router.put("/address/:addressId", protect, ctrl.updateAddress);
router.delete("/address/:addressId", protect, ctrl.deleteAddress);
router.patch("/address/:addressId/default", protect, ctrl.setDefaultAddress);
module.exports = router;
